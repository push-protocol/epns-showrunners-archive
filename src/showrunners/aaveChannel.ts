// @name: Aave Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import { ethers } from 'ethers';
import epnsNotify from '../helpers/epnsNotifyHelper';

const NETWORK_TO_MONITOR = config.web3PolygonMumbaiRPC;
const HEALTH_FACTOR_THRESHOLD = 1.4;
const CUSTOMIZABLE_SETTINGS = {
  'precision': 3,
}

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@Service()
export default class AaveChannel {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}


  public getAaveInteractableContract(web3network) {
    let aaveLendingPoolDeployedContract
   
    switch (web3network) {
      case config.web3KovanNetwork:
        aaveLendingPoolDeployedContract = config.aaveLendingPoolDeployedContractKovan
        break;
      case config.web3MainnetNetwork:
        aaveLendingPoolDeployedContract = config.aaveLendingPoolDeployedContractMainnet
        break;
      case config.web3PolygonMumbaiRPC:
        aaveLendingPoolDeployedContract = config.aaveLendingPoolDeployedContractPolygonMumbai
        break;
      case config.web3PolygonMainnetRPC:
        aaveLendingPoolDeployedContract = config.aaveLendingPoolDeployedContractPolygonMainnet
        break;
      default:
        break;
    }

    return epnsNotify.getInteractableContracts(
      web3network,                                              // Network for which the interactable contract is req
      {                                                                       // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
      },
      channelWalletsInfo.walletsKV['aavePrivateKey_1'],                       // Private Key of the Wallet sending Notification
      aaveLendingPoolDeployedContract,                                             // The contract address which is going to be used
      config.aaveLendingPoolDeployedContractABI                                           // The contract abi which is going to be useds
    );
  }

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        channelWalletsInfo.walletsKV['aavePrivateKey_1'],            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    let networkToMonitor = NETWORK_TO_MONITOR;

    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
    const simulateAaveNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("aaveNetwork") ? simulate.logicOverride.aaveNetwork : false;

    if(mode){
      if(simulateAaveNetwork){
        networkToMonitor = simulateAaveNetwork
      }
    }
    logger.debug('Checking for aave addresses... ');
    return await new Promise((resolve, reject) => {
      const aaveChannelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['aavePrivateKey_1']);
       // Call Helper function to get interactableContracts
      const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
      const aave = this.getAaveInteractableContract(networkToMonitor);      
    })
  }

  public async getHealthFactor(aave, networkToMonitor, userAddress, simulate){
    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
    const simulateApplyToAddr = logicOverride && simulate.logicOverride.hasOwnProperty("applyToAddr") ? simulate.logicOverride.applyToAddr : false;
    const simulateAaveNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("aaveNetwork") ? simulate.logicOverride.aaveNetwork : false;
    if(mode){
      if(simulateApplyToAddr){
        userAddress = simulateApplyToAddr
      }
      if(simulateAaveNetwork){
        networkToMonitor = simulateAaveNetwork
      }
    }
    

    if(!aave){
      aave = this.getAaveInteractableContract(networkToMonitor)
    }
    const logger = this.logger;
    const userData = await aave.contract.getUserAccountData(userAddress)
    let  healthFactor = ethers.utils.formatEther(userData.healthFactor)
    logger.debug("For wallet: %s, Health Factor: %o", userAddress, healthFactor);
    return {
      success: true,
      healthFactor
    }
  }

  public async checkHealthFactor(aave, networkToMonitor, userAddress, simulate) {
    const logger = this.logger;

    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
    const simulateApplyToAddr = logicOverride && simulate.logicOverride.hasOwnProperty("applyToAddr") ? simulate.logicOverride.applyToAddr : false;
    const simulateAaveNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("aaveNetwork") ? simulate.logicOverride.aaveNetwork : false;

    if(mode){
      if(simulateApplyToAddr){
        userAddress = simulateApplyToAddr
      }
      if(simulateAaveNetwork){
        networkToMonitor = simulateAaveNetwork
      }
    }
    

    if(!aave){
      aave = this.getAaveInteractableContract(networkToMonitor)
    }
    return new Promise(async(resolve, reject) => {
      const res = await this.getHealthFactor(aave, networkToMonitor, userAddress, simulate)
      if(Number(res.healthFactor) <= HEALTH_FACTOR_THRESHOLD){
        this.getPayload(userAddress, res.healthFactor, simulate)
        .then(payload => {
          epnsNotify.uploadToIPFS(payload, logger, simulate)
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
          logger.error("Unable to proceed with Aave Liquidation Alert!Function for wallet: %s, error: %o", userAddress, err);
          resolve({
            success: false,
            err: "Unable to proceed with Aave Liquidation Alert! Function for wallet: " + userAddress + " | error: " + err
          });
        });
      }
      else {
        resolve({
          success: false,
          err: userAddress + " is not about to get liquidated"
        });
      }
      
    })
  }


  public async getPayload(userAddress, healthFactor, simulate) {
    const logger = this.logger;
    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
    const simulateApplyToAddr = logicOverride && simulate.logicOverride.hasOwnProperty("applyToAddr") ? simulate.logicOverride.applyToAddr : false;
    const simulateHealthFactor = logicOverride && simulate.logicOverride.hasOwnProperty("healthFactor") ? simulate.logicOverride.healthFactor : false;
    
    if(mode){
      if(simulateApplyToAddr){
        userAddress = simulateApplyToAddr
      }
      if(simulateHealthFactor){
        healthFactor = simulateHealthFactor
      }
    }
    
    const precision = CUSTOMIZABLE_SETTINGS.precision;
    logger.debug('Preparing payload...');
    return await new Promise(async(resolve, reject) => {
      let newHealthFactor = parseFloat(healthFactor).toFixed(precision);

      const title = "Aave Liquidity Alert!";
      const message =  userAddress + " your account has healthFactor "+ newHealthFactor + ". Maintain it above 1 to avoid liquidation.";

      const payloadTitle = "Aave Liquidity Alert!";
      const payloadMsg = `Dear [d:${userAddress}] your account has healthFactor ${newHealthFactor} . Maintain it above 1 to avoid liquidation.[timestamp: ${Math.floor(new Date() / 1000)}]`;

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
