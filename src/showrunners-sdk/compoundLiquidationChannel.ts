// @name: Compound Liquidation Channel
// @version: 1.0
// @recent_changes: Compound Liquidation Tracker

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
// import PQueue from 'p-queue';
import { ethers, logger } from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '../sdk'
// import epnsHelper, {InfuraSettings, NetWorkSettings} from '@epnsproject/backend-sdk'
// const queue = new PQueue();
const channelKey = channelWalletsInfo.walletsKV['compComptrollerPrivateKey_1']

const infuraSettings: InfuraSettings = {
  projectID: config.infuraAPI.projectID,
  projectSecret: config.infuraAPI.projectSecret
}
const settings: NetWorkSettings = {
  alchemy: config.alchemyAPI,
  infura: infuraSettings,
  etherscan: config.etherscanAPI
}
const epnsSettings: EPNSSettings = {
  network: config.web3RopstenNetwork,
  contractAddress: config.deployedContract,
  contractABI: config.deployedContractABI
}

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;

const sdk = new epnsHelper(config.web3MainnetNetwork, channelKey, settings, epnsSettings)

@Service()
export default class CompoundLiquidationChannel {
  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    logger.debug(`[${new Date(Date.now())}]-[Compound]- Checking for liquidated address... `);
    return await new Promise(async(resolve, reject) => {
      const compoundChannelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['compComptrollerPrivateKey_1']);
       // Call Helper function to get interactableContracts
      const epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);
      // const compound = this.getCompoundInteractableContract(config.web3KovanProvider);
      const users = await sdk.getSubscribedUsers()
      const compound = await sdk.getContract(config.compComptrollerDeployedContract, config.compComptrollerDeployedContractABI)

      users.map(async(log) => {
        // Get user address
        const userAddress = log.args.user;
        await this.getUsersTotal(compound, NETWORK_TO_MONITOR, userAddress, simulate)
      })
      resolve("Processing Compound Liquidation Alert! logic completed!");
    
    })
  }

  public async checkLiquidity(compound, networkToMonitor, userAddress) {
    if(!compound){
      compound = await sdk.getContract(config.compComptrollerDeployedContract, config.compComptrollerDeployedContractABI)
    }
    return new Promise((resolve, reject) => {
      compound.contract.getAccountLiquidity(userAddress)
      .then(result => {
        let {1:liq} = result;
        liq = ethers.utils.formatEther(liq).toString();

          resolve({
            liquidity: liq,
            name: userAddress
          })

        
      })
      .catch(err => {
        logger.error(`[${new Date(Date.now())}]-[Compound]- Error occurred on Compound Liquidation for Address Liquidation amount: %s: %o`, userAddress, err);
        resolve({
          success: false,
          err: err
        });
      })
    })
  }

  // To Check Account for Amount Left to Liquidation
  public async checkAssets(compound, networkToMonitor, userAddress) {
    if(!compound){
      compound = await sdk.getContract(config.compComptrollerDeployedContract, config.compComptrollerDeployedContractABI)
    }
    return new Promise((resolve, reject) => {

      let allLiquidity =[];

      compound.contract.getAssetsIn(userAddress)
      .then(async(marketAddress) => {

        let cDai = await sdk.getContract(config.cDaiDeployedContract, config.cDaiDeployedContractABI);
        let cBat = await sdk.getContract(config.cBatDeployedContract, config.cBatDeployedContractABI);
        let cEth = await sdk.getContract(config.cEthDeployedContract,config.cEthDeployedContractABI);
        let cRep = await sdk.getContract(config.cRepDeployedContract,config.cRepDeployedContractABI);
        let cSai = await sdk.getContract(config.cSaiDeployedContract,config.cSaiDeployedContractABI);
        let cUni = await sdk.getContract(config.cUniDeployedContract,config.cUniDeployedContractABI);
        let cUsdc = await sdk.getContract(config.cUsdcDeployedContract,config.cUsdcDeployedContractABI);
        let cUsdt = await sdk.getContract(config.cUsdtDeployedContract,config.cUsdtDeployedContractABI);
        let cWbtc = await sdk.getContract(config.cWbtcDeployedContract,config.cWbtcDeployedContractABI);
        let cZrx = await sdk.getContract(config.cZrxDeployedContract,config.cZrxDeployedContractABI);
        let price = await sdk.getContract(config.priceOracleDeployedContract,config.priceOracleDeployedContractABI);

        this.checkLiquidity(compound, networkToMonitor, userAddress)
        .then((results: any) =>{
          logger.info(`[${new Date(Date.now())}]-[Compound]- Market Address is in: %o | Address: :%o `, marketAddress, results.name);
          for (let i = 0; i < marketAddress.length; i++) {
            let cAddresses = [0xf0d0eb522cfa50b716b3b1604c4f0fa6f04376ad, 0x4a77fAeE9650b09849Ff459eA1476eaB01606C7a,0x41b5844f4680a8c38fbb695b7f9cfd1f64474a72,
              0xa4ec170599a1cf87240a35b9b1b8ff823f448b57,0xb3f7fb482492f4220833de6d6bfcc81157214bec,0x35a18000230da775cac24873d00ff85bccded550,
              0x4a92e71227d294f041bd82dd8f78591b75140d63,0x3f0a0ea2f86bae6362cf9799b523ba06647da018,0xa1faa15655b0e7b6b6470ed3d096390e6ad93abb,0xaf45ae737514c8427d373d50cd979a242ec59e5a]
            let contracts = [cDai,cBat,cEth,cRep,cSai,cUni,cUsdc,cUsdt,cWbtc,cZrx]

            if(marketAddress[i] == marketAddress[i])  {
                let contract = this.assignContract(marketAddress[i], cAddresses,contracts);
                let address = marketAddress[i];

                allLiquidity.push(
                  this.getUserTotalLiquidityFromAllAssetEntered(contract, address, compound, price, userAddress)
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
          logger.error(`[${new Date(Date.now())}]-[Compound]- Error occurred in checkLiquidity: %o`, userAddress, err);
          resolve({
            success: false,
            err: err
          });
        })
      })
      .catch(err => {
        logger.error(`[${new Date(Date.now())}]-[Compound]- Error occurred in getAssetsIn: %o`, userAddress, err);
        resolve({
          success: false,
          err: err
        });
      })
    });
  }

  public async getUsersTotal(compound, networkToMonitor, userAddress, simulate) {
    if(!compound){
      compound = await sdk.getContract(config.compComptrollerDeployedContract, config.compComptrollerDeployedContractABI)
    }
    return new Promise((resolve, reject) => {

      this.checkAssets(compound, networkToMonitor, userAddress)
      .then(async  (results: any) => {
        Promise.all(results.allLiquidity)
        .then(async(result: any) => {
          let sumAllLiquidityOfAsset = 0;
          for (let i = 0; i < result.length; i++) {
            sumAllLiquidityOfAsset += result[i];
          }
          logger.info(`[${new Date(Date.now())}]-[Compound]- Entire Liquidity Address has: %o | Address: %o `, sumAllLiquidityOfAsset, results.addressName);
          // get 10% of user liquidity
          let liquidityAlert = 10*sumAllLiquidityOfAsset/100;

          // checking if liquidity amount left is below 10%
          if(liquidityAlert > 0 &&  results.liquidity < liquidityAlert){
            const percentage = Math.floor((results.liquidity*100) /sumAllLiquidityOfAsset);
            const title = "Compound Liquidity Alert!";
            const message =  results.addressName + " your account has %"+ percentage + " left before it gets liquidated";
            const payloadTitle = "Compound Liquidity Alert!";
            const payloadMsg = "Dear [d:" + results.addressName + "] your account has %"+ percentage + " left before it gets liquidated";
            const tx = await sdk.sendNotification(results.addressName, title, message, payloadTitle, payloadMsg, simulate)
            logger.info(tx);
          }
          else {
            logger.debug(`[${new Date(Date.now())}]-[Compound]- Date Expiry condition unmet for wallet: : %o `, userAddress);
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

  public async getUserTotalLiquidityFromAllAssetEntered(contract, address, compound, price, userAddress) {
    logger.debug(`[${new Date(Date.now())}]-[Compound]- Preparing user liquidity info...`);
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
        logger.error(`[${new Date(Date.now())}]-[Compound]- Error occurred while looking at markets: %o`, err);
        reject(err);
      })
      })
      .catch(err => {
        logger.error(`[${new Date(Date.now())}]-[Compound]- Error occurred while looking at getUnderlyingPrice: %o`, err);
        reject(err);
      })
     })
     .catch(err => {
      logger.error(`[${new Date(Date.now())}]-[Compound]- Error occurred while looking at getAccountSnapshot: %o`, err);
      reject(err);
    })
     })
  }
}
