import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const epnsNotify = require('../helpers/epnsNotifyHelper');

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
      const compoundChannelAddress = ethers.utils.computeAddress(config.compComptrollerPrivateKey);
      

       // Call Helper function to get interactableContracts
       const epns = epnsNotify.getInteractableContracts(
        config.web3RopstenNetwork,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        config.ensDomainExpiryPrivateKey,                                       // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );

      const compound = epnsNotify.getInteractableContracts(
        config.web3RopstenProvider,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        config.compComptrollerPrivateKey,                                       // Private Key of the Wallet sending Notification
        config.compComptrollerDeployedContract,                                             // The contract address which is going to be used
        config.compComptrollerDeployedContractABI                                           // The contract abi which is going to be useds
      );

      epns.contract.channels(compoundChannelAddress)
      .then(async (channelInfo) => {
        
      const filter = epns.contract.filters.Subscribe(compoundChannelAddress)

      let startBlock = channelInfo.channelStartBlock.toNumber();

      //Function to get all the addresses in the channel
      epns.contract.queryFilter(filter, startBlock)
      .then(async (eventLog) => {
        // Log the event
        logger.debug("Event log returned %o", eventLog);

        // Loop through all addresses in the channel and decide who to send notification
        let allTransactions = [];

        eventLog.map((log) => {
          // Get user address
          const userAddress = log.args.user;
          allTransactions.push(
            this.getUsersTotal(compound,userAddress)
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
              
              const storageType = 1; // IPFS Storage Type
                      const txConfirmWait = 1; // Wait for 0 tx confirmation

                      // Send Notification
                      await epnsNotify.sendNotification(
                        epns.signingContract,                                           // Contract connected to signing wallet
                        wallet,                                                         // Recipient to which the payload should be sent
                        payloadType,                                                    // Notification Type
                        storageType,                                                    // Notificattion Storage Type
                        ipfshash,                                                       // Notification Storage Pointer
                        txConfirmWait,                                                  // Should wait for transaction confirmation
                        logger                                                          // Logger instance (or console.log) to pass
                      ).then ((tx) => {
                        logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                        resolve(tx);
                      })
                      .catch (err => {
                        logger.error("🔥Error --> sendNotification(): %o", err);
                        reject(err);
                      });
              
              try {
                let tx = await epns.signingContract.sendMessage(wallet, payloadType, ipfshash, 1);
                logger.info("Transaction sent: %o", tx);
              }
              catch (err) {
                logger.error("Unable to complete transaction, error: %o", err);
              }
            }
          }
          logger.debug("Compound Liquidation Alert! logic completed!");
          // })
        })
        .catch(err => {
          logger.error("Error occurred sending transactions: %o", err);
          reject(err);
        });
          resolve("Processing Compound Liquidation Alert! logic completed!");
        })
        .catch(err => {
          logger.error("Error occurred while looking at event log: %o", err);
          reject(err);
        })
      })
      .catch(err => {
        logger.error("Error retreiving channel start block: %o", err);
        reject(err);
      });
    })
  }

  public async getContracts(address, abi){
    return new Promise((resolve, reject) => {
    const setUp = epnsNotify.getInteractableContracts(
      config.web3RopstenProvider,                                              // Network for which the interactable contract is req
      {                                                                        // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
      },
      config.compComptrollerPrivateKey,                                       // Private Key of the Wallet sending Notification
      address,                                                                // The contract address which is going to be used
      abi                                                                     // The contract abi which is going to be useds
    );
    resolve(setUp);
    })
  }

  public async checkLiquidity(compound,userAddress){
    const logger = this.logger;
    return new Promise((resolve, reject) => {
      compound.contract.getAccountLiquidity(userAddress)
      .then(result => {
        let {1:liq} = result;
        liq = ethers.utils.formatEther(liq).toString();
        compound.provider.lookupAddress(userAddress)
        .then(async (ensAddressName) => {
          let addressName = ensAddressName;

          resolve({
            liquidity:liq,
            name:addressName
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
    })       
  }

  // To Check Account for Amount Left to Liquidation
  public async checkAssets(compound, userAddress) {
    const logger = this.logger;
    return new Promise((resolve, reject) => {

      let allLiquidity =[];

      compound.contract.getAssetsIn(userAddress)
      .then(async(marketAddress) => {

        let cDai = await this.getContracts(config.cDaiDeployedContract, config.cDaiDeployedContractABI);
        let cBat = await this.getContracts(config.cBatDeployedContract, config.cBatDeployedContractABI);
        let cEth = await this.getContracts(config.cEthDeployedContract,config.cEthDeployedContractABI);
        let cRep = await this.getContracts(config.cRepDeployedContract,config.cRepDeployedContractABI);
        let cSai = await this.getContracts(config.cSaiDeployedContract,config.cSaiDeployedContractABI);
        let cUni = await this.getContracts(config.cUniDeployedContract,config.cUniDeployedContractABI);
        let cUsdc = await this.getContracts(config.cUsdcDeployedContract,config.cUsdcDeployedContractABI);
        let cUsdt = await this.getContracts(config.cUsdtDeployedContract,config.cUsdtDeployedContractABI);
        let cWbtc = await this.getContracts(config.cWbtcDeployedContract,config.cWbtcDeployedContractABI);
        let cZrx = await this.getContracts(config.cZrxDeployedContract,config.cZrxDeployedContractABI);
        let price = await this.getContracts(config.priceOracleDeployedContract,config.priceOracleDeployedContractABI);

        this.checkLiquidity(compound,userAddress)
        .then(results =>{
          logger.info("Market Address is in: %o | Address: :%o ", marketAddress, results.name);
          for (let i = 0; i < marketAddress.length; i++) {
            let cAddresses = [0xdb5ed4605c11822811a39f94314fdb8f0fb59a2c, 0x9e95c0b2412ce50c37a121622308e7a6177f819d,0xbe839b6d93e3ea47effcca1f27841c917a8794f3,
              0x158079ee67fce2f58472a96584a73c7ab9ac95c1,0xf5dce57282a584d2746faf1593d3121fcac444dc,0x35a18000230da775cac24873d00ff85bccded550,
              0x39aa39c021dfbae8fac545936693ac917d5e7563,0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9,0xc11b1268c1a384e55c48c2391d8d480264a3a7f4,0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407]
            let contracts = [cDai,cBat,cEth,cRep,cSai,cUni,cUsdc,cUsdt,cWbtc,cZrx]

            if(marketAddress[i] == marketAddress[i])  {
                let contract = this.assignContract(marketAddress[i], cAddresses,contracts);
                let address = marketAddress[i];

                allLiquidity.push(
                  this.getUserTotalLiquidityFromAllAssetEntered(contract,address,compound,price,userAddress)
                  .then(result =>{
                    return result
                  })
                )
            }
          }

          const liquidity = results.liquidity;
          const addressName = results.name;

          resolve({
            allLiquidity:allLiquidity,
            liquidity:liquidity,
            addressName:addressName
          });
          
        })
        .catch(err => {
          logger.error("Error occurred in checkLiquidity: %o", userAddress, err);
          resolve({
            success: false,
            err: err
          });
        }) 
      })
      .catch(err => {
        logger.error("Error occurred in getAssetsIn: %o", userAddress, err);
        resolve({
          success: false,
          err: err
        });
      }) 
    });
  }

  public async getUsersTotal(compound,userAddress){
    const logger = this.logger;
    return new Promise((resolve, reject) => {

      this.checkAssets(compound,userAddress)
      .then(async  (results) => {
        Promise.all(results.allLiquidity)
        .then(result => {
          let sumAllLiquidityOfAsset = 0;
          for (let i = 0; i < result.length; i++) {
            sumAllLiquidityOfAsset += result[i];
          }
          logger.info("Entire Liquidity Address has: %o | Address: %o ", sumAllLiquidityOfAsset, results.addressName);
          // get 10% of user liquidity
          let liquidityAlert = 10*sumAllLiquidityOfAsset/100;

          // checking if liquidity amount left is below 10%
          if(liquidityAlert > 0 &&  results.liquidity < liquidityAlert){
            this.getCompoundLiquidityPayload(results.addressName, results.liquidity, sumAllLiquidityOfAsset)
              .then(payload => {
                epnsNotify.uploadToIPFS(payload, logger)
                .then(async (ipfshash) => {

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
    })
  }

  public assignContract(result,cAddresses, contracts){
    for (let p = 0; p < cAddresses.length; p++) {
      if (result == cAddresses[p]){
        return contracts[p]
      }
    }
  }

  public async getUserTotalLiquidityFromAllAssetEntered(contract,address,compound,price,userAddress) {
    const logger = this.logger;
    logger.debug('Preparing user liquidity info...');
    return await new Promise((resolve, reject) => {
      let sumCollateral;
      let cTokenBalance;
      let exchangeRateStored;
      let oraclePrice;
      let collateralFactor;

      contract.contract.getAccountSnapshot(userAddress)
       .then(result => {
        let {1:result1, 3:result2} = result;
        result2 = (result2/1e18)
        result1 = result1/1e8
        cTokenBalance = result1;
        exchangeRateStored = result2

      price.contract.getUnderlyingPrice(address)
       .then(result => {
        let result3 = (result / 1e18)
        oraclePrice = result3

        compound.contract.markets(address)
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
    return await new Promise(async(resolve, reject) => {

      const percentage = Math.floor((liquidity*100) /sumAllLiquidityOfAsset);
      const title = "Compound Liquidity Alert!";
      const message =  addressName + " your account has %"+ percentage + " left before it gets liquidated";

      const payloadTitle = "Compound Liquidity Alert!";
      const payloadMsg = "Dear [d:" + addressName + "] your account has %"+ percentage + " left before it gets liquidated";

      const payload = await epnsNotify.preparePayload(
        null,                                                               // Recipient Address | Useful for encryption
        3,                                                                  // Type of Notification
        title,                                                              // Title of Notification
        message,                                                            // Message of Notification
        payloadTitle,                                                       // Internal Title
        payloadMsg,                                                         // Internal Message
        null,                                                               // Internal Call to Action Link
        null,                                                               // internal img of youtube link
      );

      logger.debug('Payload Prepared: %o', payload);

      resolve(payload);
    });
  }
}
