import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');

@Service()
export default class CompoundLiquidationChannel {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  // To form and write to smart contract
  public async sendMessageToContract() {
    const logger = this.logger;
    logger.debug('Checking for liquidated address... ');
    return await new Promise((resolve, reject) => {
      // Preparing to get all subscribers of the channel
      // const mainnetProvider = new ethers.providers.InfuraProvider();
      // const provider = new ethers.providers.InfuraProvider('ropsten');
      const network = "ropsten";
      const provider = ethers.getDefaultProvider(network, {
        infura: config.infuraId
    });


      let wallet = new ethers.Wallet(config.compComptrollerPrivateKey, provider);

      let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
      let epnsContractWithSigner = epnsContract.connect(wallet);

      let compComptrollerContract = new ethers.Contract(config.compComptrollerDeployedContract, config.compComptrollerDeployedContractABI, provider);

      const filter = epnsContract.filters.Subscribe("0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54")

      let fromBlock = 0;
       
      //Function to get all the addresses in the channel
      epnsContract.queryFilter(filter, fromBlock)
        .then(eventLog => {
          // Log the event
          logger.debug("Event log returned %o", eventLog);
           
          // Loop through all addresses in the channel and decide who to send notification
          let allTransactions = [];

          eventLog.forEach((log) => {
            // Get user address
            const userAddress = log.args.user;
            allTransactions.push(
              this.checkCompoundLiquidation(compComptrollerContract, provider, userAddress)
                .then( (results) => {
                  return results;
                })
              );
            })
            
            // resolve all transactions
          Promise.all(allTransactions)
          .then(async (results) => {
            logger.debug("All Transactions Loaded: %o", results);

            for (const object of results) {
              if (object.success) {
              // Send notification
              const wallet = object.wallet;
              const ipfshash = object.ipfshash;
              const payloadType = object.payloadType;

              logger.info("Wallet: %o | Hash: :%o | Sending Data...", wallet, ipfshash);
              try {
                const nonce = provider.getTransactionCount(wallet.address, 'pending');
                
                const options = {
                  nonce
              };
                let tx = await epnsContractWithSigner.sendMessage(wallet, payloadType, ipfshash, 1);

                logger.info("Transaction sent: %o", tx);
              }
              catch (err) {
                logger.error("Unable to complete transaction, error: %o", err);
              }
            }
          }
          logger.debug("Compound Liquidation Alert! logic completed!");
          })
          resolve("Processing Compound Liquidation Alert! logic completed!");
        })
        .catch(err => {
          logger.error("Error occurred while looking at event log: %o", err);
          reject(err);
        }) 
    })
  }
    
  // To Check Account for Amount Left to Liquidation 
  public async checkCompoundLiquidation(compComptrollerContract, provider, userAddress) {
    const logger = this.logger;
    return new Promise((resolve, reject) => {

      compComptrollerContract.getAccountLiquidity(userAddress)
      .then(result => {
        let {1:liquidity} = result;
        liquidity = ethers.utils.formatEther(liquidity).toString();

        // Lookup the address
        provider.lookupAddress(userAddress)
        .then(ensAddressName => {
          let addressName = ensAddressName;

          let cDai = new ethers.Contract(config.cDaiDeployedContract,config.cDaiDeployedContractABI,  provider);
          let cBat = new ethers.Contract(config.cBatDeployedContract,config.cBatDeployedContractABI,  provider);
          let cEth = new ethers.Contract(config.cEthDeployedContract,config.cEthDeployedContractABI,  provider);
          let price = new ethers.Contract(config.priceOracleDeployedContract,config.priceOracleDeployedContractABI,  provider);
          let allLiquidity =[];
          
          compComptrollerContract.getAssetsIn(userAddress)
            .then(marketAddress => {
              logger.info("Market Address is in: %o | Address: :%o ", marketAddress, addressName); 

              for (let i = 0; i < marketAddress.length; i++) {
                let cAddresses = [0xdb5ed4605c11822811a39f94314fdb8f0fb59a2c, 0x9e95c0b2412ce50c37a121622308e7a6177f819d,0xbe839b6d93e3ea47effcca1f27841c917a8794f3]
                let contracts = [cDai,cBat,cEth]

                if(marketAddress[i] == marketAddress[i])  {
                    let contract = this.assignContract(marketAddress[i], cAddresses,contracts);
                    let address = marketAddress[i];
                    
                    allLiquidity.push(
                      this.getUserTotalLiquidityFromAllAssetEntered(contract,address,compComptrollerContract,price,userAddress)
                      .then(result =>{
                        return result                  
                      })
                    )
                }
              }

              Promise.all(allLiquidity)
              .then(result =>{
                let sumAllLiquidityOfAsset = 0;
                for (let i = 0; i < result.length; i++) {
                  
                  sumAllLiquidityOfAsset += result[i]
                }
                logger.info("Entire Liquidity Address has: %o | Address: %o ", sumAllLiquidityOfAsset, addressName);
                // get 10% of user liquidity 
                let liquidityAlert = 10*sumAllLiquidityOfAsset/100;        
          
                // checking if liquidity amount left is below 10%
                if(liquidityAlert > 0 &&  liquidity < liquidityAlert){
                  this.getCompoundLiquidityPayload(addressName, liquidity, sumAllLiquidityOfAsset)
                    .then(payload => {
                      const jsonisedPayload = JSON.stringify(payload);

                      // handle payloads, etc
                      const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
                      ipfs.add(jsonisedPayload)
                        .then(ipfshash => {
                          resolve({ 
                            success: true,
                            wallet: userAddress, 
                            ipfshash: ipfshash,
                            payloadType: parseInt(payload.data.type)
                          });
                        })
                        .catch(err => {
                          logger.error("Unable to obtain ipfshash for wallet: %s, error: %o", userAddress, err)
                          resolve({
                            success: false,
                            err: "Unable to obtain ipfshash for wallet: " + userAddress + " | error: " + err
                          });
                        });
                    })
                    .catch(err => {
                      logger.error("Unable to proceed with Compound Liquidation Alert!Function for wallet: %s, error: %o", userAddress, err);
                      resolve({
                        success: false,
                        err: "Unable to proceed with Compound Liquidation Alert! Function for wallet: " + userAddress + " | error: " + err
                      });
                    });
                  }
                else {
                  resolve({
                    success: false,
                    err: "Date Expiry condition unmet for wallet: " + userAddress
                  });
                }
              })     
            })
            .catch(err => {
              logger.error("Error occurred in getAssetsIn: %s: %o", userAddress, err);
              resolve({
                success: false,
                err: err
              });
            })
        })
        .catch(err => {
            logger.error("Error occurred in lookup of address[%s]: %o", userAddress, err);
            resolve({
              success: false,
              err: err
            });
        });
      })
      .catch(err => {
        logger.error("Error occurred on Compound Liquidation for Address Liquidation amount: %s: %o", userAddress, err);
        resolve({
          success: false,
          err: err
        });
      })
    });
  }

  public assignContract(result,cAddresses, contracts){    
    for (let p = 0; p < cAddresses.length; p++) {
      if (result == cAddresses[p]){
        return contracts[p]
      }
    }
  }
  public async getUserTotalLiquidityFromAllAssetEntered(contract,address,compComptrollerContract,price,userAddress) {
    const logger = this.logger;
    logger.debug('Preparing user liquidity info...');
    return await new Promise((resolve, reject) => {
      let sumCollateral;
      let cTokenBalance;
      let exchangeRateStored;
      let oraclePrice;
      let collateralFactor;
      
      contract.getAccountSnapshot(userAddress)
       .then(result => {
        let {1:result1, 3:result2} = result;
        result2 = (result2/1e18)
        result1 = result1/1e8
        cTokenBalance = result1;
        exchangeRateStored = result2    
  
      price.getUnderlyingPrice(address)
       .then(result => {
        let result3 = (result / 1e18)
        oraclePrice = result3   
  
      compComptrollerContract.markets(address)
        .then(result => {
          let {1:result4} = result;
          result4 = (result4 / 1e18) * 100;
          collateralFactor = result4;
  
       sumCollateral = (cTokenBalance*exchangeRateStored*oraclePrice*collateralFactor)/1e12;
        resolve(sumCollateral)
      })
      .catch(err => {
        logger.error("Error occurred while looking at markets: %o", err);
        reject(err);
      })
      })
      .catch(err => {
        logger.error("Error occurred while looking at getUnderlyingPrice: %o", err);
        reject(err);
      })
     })
     .catch(err => {
      logger.error("Error occurred while looking at getAccountSnapshot: %o", err);
      reject(err);
    })
     })
  }

  public async getCompoundLiquidityPayload(addressName, liquidity, sumAllLiquidityOfAsset) {
    const logger = this.logger;
    logger.debug('Preparing payload...');
    return await new Promise((resolve, reject) => {

      const percentage = Math.floor((liquidity*100) /sumAllLiquidityOfAsset);
      const title = "Compound Liquidity Alert!";
      const message =  addressName + " your account has %"+ percentage + " left before it gets liquidated";

      const payloadTitle = "Compound Liquidity Alert!";
      const payloadMsg = "Dear [d:" + addressName + "] your account has %"+ percentage + " left before it gets liquidated";

      const payload = {
        "notification": {
          "title": title,
          "body": message
        },
        "data": {
          "type": "3",
          "secret": "",
          "asub": payloadTitle,
          "amsg": payloadMsg,
          "acta": "",
          "aimg": ""
        }
      };

      logger.debug('Payload Prepared: %o', payload);

      resolve(payload);
    });
  }  
}
