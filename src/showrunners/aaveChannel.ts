// @name: Aave Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import { ethers } from 'ethers';
import epnsNotify from '../helpers/epnsNotifyHelper';

const NETWORK_TO_MONITOR = config.web3KovanNetwork;
const HEALTH_FACTOR_THRESHOLD = 1.1;
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
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        channelWalletsInfo.walletsKV['aavePrivateKey_1'],                       // Private Key of the Wallet sending Notification
        config.aaveLendingPoolDeployedContract,                                             // The contract address which is going to be used
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
    logger.debug('Checking for aave addresses... ');
    return await new Promise((resolve, reject) => {
      const aaveChannelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['aavePrivateKey_1']);
       // Call Helper function to get interactableContracts
      const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
      const aave = this.getAaveInteractableContract(config.web3KovanProvider);

      epns.contract.channels(aaveChannelAddress)
      .then(async (channelInfo) => {

        const filter = epns.contract.filters.Subscribe(aaveChannelAddress)

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
            logger.debug("🚀 ~ file: aaveChannel.ts ~ line 91 ~ AaveChannel ~ eventLog.map ~ userAddress", userAddress)
            allTransactions.push(
              this.checkHealthFactor(aave, NETWORK_TO_MONITOR, userAddress, simulate)
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
                logger,                                                        // Logger instance (or console.log) to pass
                simulate                                                        // Passing true will not allow sending actual notification
              ).then ((tx) => {
                logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                resolve(tx);
              })
              .catch (err => {
                logger.error("🔥Error --> sendNotification(): %o", err);
                reject(err);
              });
              }
            }
            logger.debug("Aave Liquidation Alert! logic completed!");
          })
          .catch(err => {
            logger.error("Error occurred sending transactions: %o", err);
            reject(err);
          });
          resolve("Processing Aave Liquidation Alert! logic completed!");
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
      const payloadMsg = "Dear [d:" + userAddress + "] your account has healthFactor "+ newHealthFactor + ". Maintain it above 1 to avoid liquidation.";

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
