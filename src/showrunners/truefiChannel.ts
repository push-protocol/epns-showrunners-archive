// @name: Truefi Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
import epnsNotify from '../helpers/epnsNotifyHelper';

const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
// SET CONSTANTS
const BLOCK_NUMBER = 'block_number';

const NOTIFICATION_TYPE = Object.freeze({
  RATE: "rate_changed",
  LOAN: "loan_due",
  NEW: "new_loan",
});

@Service()
export default class TruefiChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
    this.cached.setCache(BLOCK_NUMBER, 0);
  }

  public getTruefiInteractableContract(web3network) {
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        channelWalletsInfo.walletsKV['compComptrollerPrivateKey_1'],                       // Private Key of the Wallet sending Notification
        config.truefiRatingAgencyDeployedContract,                                             // The contract address which is going to be used
        config.truefiRatingAgencyDeployedContractABI                                           // The contract abi which is going to be useds
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
        channelWalletsInfo.walletsKV['compComptrollerPrivateKey_1'],            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );
  }
  
  public async getSubscribedUsers(simulate) {
    const logger = this.logger;
    const truefiChannelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['compComptrollerPrivateKey_1']);
    // Call Helper function to get interactableContracts
    const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
    const channelInfo = await epns.contract.channels(truefiChannelAddress)
    const filter = epns.contract.filters.Subscribe(truefiChannelAddress)
    let startBlock = channelInfo.channelStartBlock.toNumber();

    //Function to get all the addresses in the channel
    const eventLog = await epns.contract.queryFilter(filter, startBlock)
    // Log the event
    logger.debug("Event log returned %o", eventLog);
    // Loop through all addresses in the channel and decide who to send notification
    const users = eventLog.map(log => log.args.user)
    return users
  }



  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    const truefi = this.getTruefiInteractableContract(config.web3MainnetNetwork);
    logger.debug('Checking for truefi address... ');
    const users = await this.getSubscribedUsers(simulate);
    console.log("users: %o", users)
    await this.checkNewLoans(truefi, users, NETWORK_TO_MONITOR)
  }

  


  public async checkNewLoans(truefi, users,  networkToMonitor) {
    if(!truefi){
      truefi = this.getTruefiInteractableContract(networkToMonitor)
    }
    const logger = this.logger;
    const cache = this.cached;
    // get and store last checked block number to run filter
    const filter = truefi.contract.filters.LoanSubmitted();
    console.log("filters: %o", filter)
    let startBlock = await cache.getCache(BLOCK_NUMBER);
    if (!startBlock) startBlock = 0

    //Function to get all the addresses in the channel
    // const eventLog = await epns.contract.queryFilter(filter, startBlock)

  }

  // public async checkLoans(compound, networkToMonitor, userAddress) {
  //   if(!compound){
  //     compound = this.getTruefiInteractableContract(networkToMonitor)
  //   }
  //   const logger = this.logger;
  //   return new Promise((resolve, reject) => {
  //     compound.contract.getAccountLiquidity(userAddress)
  //     .then(result => {
  //       let {1:liq} = result;
  //       liq = ethers.utils.formatEther(liq).toString();

  //         resolve({
  //           liquidity: liq,
  //           name: userAddress
  //         })

        
  //     })
  //     .catch(err => {
  //       logger.error("Error occurred on Compound Liquidation for Address Liquidation amount: %s: %o", userAddress, err);
  //       resolve({
  //         success: false,
  //         err: err
  //       });
  //     })
  //   })
  // }

  public async getTruefiLiquidityPayload(addressName, data, notificationType) {
    const logger = this.logger;
    logger.debug('Preparing payload...');
    return await new Promise(async(resolve, reject) => {
      let title, message, payloadTitle, payloadMsg;
      switch (notificationType) {
        case NOTIFICATION_TYPE.RATE:
          title = "Truefi Rate Change";
          message = "Truefi loan rate has been changed to " + data.rate;
          payloadMsg = "Truefi loan rate has been changed to " + data.rate;
          payloadTitle = "Truefi Rate Change";
          break;
        case NOTIFICATION_TYPE.LOAN:
          title = "Truefi Loan Due";
          message = "Your Truefi loan is due in " + data.date + " days";
          payloadMsg = "Your Truefi loan is due in " + data.date + " days";
          payloadTitle = "Truefi Loan Due";
          break;
        case NOTIFICATION_TYPE.NEW:
          title = "Truefi New Loan";
          message = "A new loan has been posted on truefi, visit to vote";
          payloadMsg = "A new loan has been posted on truefi, visit to vote";
          payloadTitle = "Truefi New Loan";
          break;
        default:
          break;
      }
      
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
