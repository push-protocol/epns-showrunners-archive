// @name: Truefi Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import PQueue from 'p-queue';
import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
import epnsNotify from '../helpers/epnsNotifyHelper';
const queue = new PQueue();

// const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
// SET CONSTANTS
const BLOCK_NUMBER = 'truefi_block_number';
const LOANS = 'truefi_loans';

const NOTIFICATION_TYPE = Object.freeze({
  RATE: "rate_changed",
  DUE_LOAN: "loan_due",
  NEW_LOAN: "new_loan",
});

@Service()
export default class TruefiChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
    this.cached.setCache(BLOCK_NUMBER, 0);
    this.cached.removeCache(LOANS)
  }

  public getTruefiRatingAgencyInteractableContract(web3network) {
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        null,                       // Private Key of the Wallet sending Notification
        config.truefiRatingAgencyDeployedContract,                                             // The contract address which is going to be used
        config.truefiRatingAgencyDeployedContractABI                                           // The contract abi which is going to be useds
      );
  }

  public getTruefiLoanFactoryInteractableContract(web3network) {
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        null,                       // Private Key of the Wallet sending Notification
        config.truefiLoanFactoryDeployedContract,                                             // The contract address which is going to be used
        config.truefiLoanFactoryDeployedContractABI                                           // The contract abi which is going to be useds
      );
  }

  public getTruefiLenderDeployedInteractableContract(web3network) {
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        null,                       // Private Key of the Wallet sending Notification
        config.truefiLenderDeployedContract,                                             // The contract address which is going to be used
        config.truefiLenderDeployedContractABI                                           // The contract abi which is going to be useds
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
        channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1'],            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );
  }

  public async getContracts(address, abi, web3network){
    return new Promise((resolve, reject) => {
    const setUp = epnsNotify.getInteractableContracts(
      web3network,                                              // Network for which the interactable contract is req
      {                                                                        // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
      },
      null,            // Private Key of the Wallet sending Notification
      address,                                                                // The contract address which is going to be used
      abi                                                                     // The contract abi which is going to be useds
    );
    resolve(setUp);
    })
  }
  
  public async getSubscribedUsers(epns, simulate) {
    const logger = this.logger;
    const truefiChannelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1']);
    const channelInfo = await epns.contract.channels(truefiChannelAddress)
    const filter = epns.contract.filters.Subscribe(truefiChannelAddress)
    let startBlock = channelInfo.channelStartBlock.toNumber();

    //Function to get all the addresses in the channel
    const eventLog = await epns.contract.queryFilter(filter, startBlock)
    const users = eventLog.map(log => log.args.user)
    return users
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    const cache = this.cached;
    // Call Helper function to get interactableContracts
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    // -- End Override logic
    // Call Helper function to get interactableContracts
    const epns = this.getEPNSInteractableContract(epnsNetwork);
    const truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    logger.debug('Checking for truefi address... ');
    const users = await this.getSubscribedUsers(epns, simulate);
    const loans = await this.checkNewLoans(epns, users, truefiNetwork, simulate)
    await this.checkActiveLoans(loans, truefiNetwork, simulate)
    await this.checkExpiry(epns, users, truefiNetwork, simulate)
    await queue.onIdle();
    const block = await epns.provider.getBlockNumber();
    await cache.setCache(BLOCK_NUMBER, block);
  }

  public async checkActiveLoans(loans, truefiNetwork, simulate) {
    try {      
      const loanPromise = loans.map(loan => this.getContracts(loan, config.truefiLoanTokenDeployedContractABI, truefiNetwork))
      const loanObj = await Promise.all(loanPromise)
      const checkStatusPromise = loanObj.map(loan => this.checkStatus(loan))
      await Promise.all(checkStatusPromise)
    } catch (error) {
      console.log("error: %o", error)
    }
  }

  public async checkExpiry(epns, users, truefiNetwork, simulate) {
    const cache = this.cached;
    const loans = await cache.getLCache(LOANS)
    const checkBorrowerPromise = loans.map(loan => this.checkBorrower(epns, users, loan, truefiNetwork, simulate))
    await Promise.all(checkBorrowerPromise)
  }

  public async checkBorrower(epns, users, loan, truefiNetwork, simulate) {
    const loanContract = await this.getContracts(loan, config.truefiLoanTokenDeployedContractABI, truefiNetwork)
    const borrower = await loanContract.contract.borrower()
    this.checkLoanExpiry(epns, borrower, loanContract, simulate)
    if (users.includes(borrower)) {
      console.log({users, borrower})
    }
  }

  public async checkLoanExpiry(epns, borrower, loanContract, simulate) {
    const logger = this.logger;
    let [start, term] = await Promise.all([loanContract.contract.start(), loanContract.contract.term()])
    start = Number(start.toString())
    term = Number(term.toString())
    const now = parseInt(Date.now()/1000);
    const passed = now - start
    const days = Math.floor((passed - term) / 86400)
    console.log({now, start, term, passed, days})
    if (days <= 10) {
      await this.sendNotification(epns, borrower, { days }, NOTIFICATION_TYPE.DUE_LOAN, simulate)
      logger.info(" Added processAndSendNotification `Due Loans` for user:%o ", borrower)
    }
  }

  public async checkStatus(loan) {
    const status = await loan.contract.status()
    if (status == 3) return this.cached.pushLCache(LOANS, loan.contract.address);
    return null
  }

  public async checkNewLoans(epns, users, networkToMonitor, simulate) {
    const truefi = this.getTruefiLoanFactoryInteractableContract(networkToMonitor)
    const logger = this.logger;
    const cache = this.cached;
    // get and store last checked block number to run filter
    const filter = truefi.contract.filters.LoanTokenCreated();
    let startBlock = await cache.getCache(BLOCK_NUMBER);
    if (!startBlock || startBlock == null) startBlock = 0
    startBlock = Number(startBlock)
    const eventLog = await truefi.contract.queryFilter(filter, startBlock)
    const loans = eventLog.map((log) => log.args.contractAddress)
    logger.debug("loans: %o, startBlock: %o", loans, startBlock)
    for (let index = 0; index < users.length; index++) {
      await queue.add(() => this.sendNotification(epns, users[index], {loans}, NOTIFICATION_TYPE.NEW_LOAN, simulate));
      logger.info(" Added processAndSendNotification `New Loans` for user:%o ", users[index])
    }
    return loans;
  }

  public async sendNotification(epns, user, data, notificationType, simulate) {
    const logger = this.logger;
    try{
      let res = await this.getPayloadHash(user, data, notificationType, simulate)
      logger.info('IPFS Hash: %o', res)

      // Send notification
      const ipfshash = res.ipfshash;
      const payloadType = res.payloadType;


      logger.info("Wallet: %o | Hash: :%o | Sending Data...", user, ipfshash);

      const storageType = 1; // IPFS Storage Type
      const txConfirmWait = 1; // Wait for 0 tx confirmation

      
      const tx = await epnsNotify.sendNotification(
        epns.signingContract,                                           // Contract connected to signing wallet
        user,                                           // Recipient to which the payload should be sent
        payloadType,                                                    // Notification Type
        storageType,                                                    // Notificattion Storage Type
        ipfshash,                                                       // Notification Storage Pointer
        txConfirmWait,                                                  // Should wait for transaction confirmation
        logger,
        simulate                                                         // Logger instance (or console.log) to pass
      )
      logger.info("Transaction successful: %o | Notification Sent", tx.hash);
      logger.info("🙌 TrueFi Channel Logic Completed!");
    } catch (error) {
      logger.debug("Sending notifications failed: ", error)
      // if (retries <=5 ) {
      //   retries++
      //   await queue.add(() => this.processAndSendNotification(epns, user, NETWORK_TO_MONITOR, simulate, interactableERC20s));
      // } else {
      //   retries = 0
      // }
    }
  }

  public async getPayloadHash(user, data, notificationType, simulate) {
    const logger = this.logger;
    try {
      const payload = await this.getTruefiLiquidityPayload(data, notificationType)
      const ipfshash = await epnsNotify.uploadToIPFS(payload, logger, simulate)
      // Sign the transaction and send it to chain
      logger.info("ipfs hash generated: %o for Wallet: %s, sending it back...", ipfshash, user);

      return {
        success: true,
        user,
        ipfshash,
        payloadType: parseInt(payload.data.type)
      };
    } catch (error) {
      logger.error("Unable to obtain ipfshash for wallet: %s, error: %o", user, error)
      return {
        success: false,
        data: "Unable to obtain ipfshash for wallet: " + user + " | error: " + error
      };
    }
  }

  public async getTruefiLiquidityPayload(data, notificationType) {
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
        case NOTIFICATION_TYPE.DUE_LOAN:
          title = "Truefi Loan Due";
          message = "Your Truefi loan is due in " + data.days + " days";
          payloadMsg = "Your Truefi loan is due in " + data.days + " days";
          payloadTitle = "Truefi Loan Due";
          break;
        case NOTIFICATION_TYPE.NEW_LOAN:
          title = "Truefi New Loan";
          message = data.loans?.length > 1?  "New loans has been posted on truefi, visit to vote" : "A new loan has been posted on truefi, visit to vote";
          payloadMsg = data.loans?.length > 1?  "New loans has been posted on truefi, visit to vote" : "A new loan has been posted on truefi, visit to vote";
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
