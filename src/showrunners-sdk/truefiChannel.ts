// @name: Truefi Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { ethers, logger } from 'ethers';
import PQueue from 'p-queue';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '../sdk'
// import epnsHelper, {InfuraSettings, NetWorkSettings} from '@epnsproject/backend-sdk'
const queue = new PQueue();
const channelKey = channelWalletsInfo.walletsKV['truefiPrivateKey_1']

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
const sdk = new epnsHelper(config.web3MainnetNetwork, channelKey, settings, epnsSettings)

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
  ) {
    this.cached.setCache(BLOCK_NUMBER, 0);
    this.cached.removeCache(LOANS)
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const cache = this.cached;
    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    const truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    // -- End Override logic
    // Call Helper function to get interactableContracts
    const epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);
    logger.debug('Checking for truefi address... ');
    const users = await sdk.getSubscribedUsers()
    const loans = await this.checkNewLoans(epns, users, truefiNetwork, simulate)
    await this.checkActiveLoans(loans, truefiNetwork, simulate)
    await this.checkExpiry(epns, users, truefiNetwork, simulate)
    await queue.onIdle();
    const block = await epns.provider.getBlockNumber();
    await cache.setCache(BLOCK_NUMBER, block);
  }

  public async checkActiveLoans(loans, truefiNetwork, simulate) {
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    if(!loans) loans = logicOverride && simulate.logicOverride.hasOwnProperty("loans") ? simulate.logicOverride.loans : [];
    if(!truefiNetwork) truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    try {      
      const loanPromise = loans.map(async loan => await sdk.getContract(loan, config.truefiLoanTokenDeployedContractABI))
      const loanObj = await Promise.all(loanPromise)
      const checkStatusPromise = loanObj.map(loan => this.checkStatus(loan))
      await Promise.all(checkStatusPromise)
    } catch (error) {
      console.log("error: %o", error)
    }
  }

  public async checkExpiry(epns, users, truefiNetwork, simulate) {
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    if (!users) users = logicOverride && simulate.logicOverride.hasOwnProperty("users") ? simulate.logicOverride.users : [];
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    if(!truefiNetwork) truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    if(!epns){
      epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);
    }
    const cache = this.cached;
    const loans = await cache.getLCache(LOANS)
    const checkBorrowerPromise = loans.map(loan => this.checkBorrower(epns, users, loan, truefiNetwork, simulate))
    return await Promise.all(checkBorrowerPromise)
  }

  public async checkBorrower(epns, users, loan, truefiNetwork, simulate) {
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    if (!users) users = logicOverride && simulate.logicOverride.hasOwnProperty("users") ? simulate.logicOverride.users : [];
    if (!loan) loan = logicOverride && simulate.logicOverride.hasOwnProperty("loans") ? simulate.logicOverride.loans[0] : "";
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    if(!truefiNetwork) truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    if(!epns){
      epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);
    }
    const loanContract = await sdk.getContract(loan, config.truefiLoanTokenDeployedContractABI)
    const borrower = await loanContract.contract.borrower()
    if (users.includes(borrower)) {
      console.log({users, borrower})
    }
    return this.checkLoanExpiry(epns, borrower, loanContract, simulate)
  }

  public async checkLoanExpiry(epns, borrower, loanContract, simulate) {
    let loan
    let users
    let truefiNetwork
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    if(!truefiNetwork) truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    if(!epns){
      epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);
    }
    if (!borrower) {
      users = logicOverride && simulate.logicOverride.hasOwnProperty("users") ? simulate.logicOverride.users : [];
      borrower = users[0]
    }
    if (!loanContract) {
      loan = logicOverride && simulate.logicOverride.hasOwnProperty("loans") ? simulate.logicOverride.loans[0] : "";
      loanContract = await sdk.getContract(loan, config.truefiLoanTokenDeployedContractABI)
    }
    
    const logger = this.logger;
    let [start, term] = await Promise.all([loanContract.contract.start(), loanContract.contract.term()])
    start = Number(start.toString())
    term = Number(term.toString())
    const now = parseInt(Date.now()/1000);
    const passed = now - start
    const days = Math.floor((passed - term) / 86400)
    console.log({now, start, term, passed, days})
    if (days <= Number(config.truefiDueLoanDays)) {
      await this.sendNotification(epns, borrower, { days }, NOTIFICATION_TYPE.DUE_LOAN, simulate)
      logger.info(" Added processAndSendNotification `Due Loans` for user: %o ", borrower)
    }
    return {expiringDays: days, benchmark: config.truefiDueLoanDays}
  }

  public async checkStatus(loan) {
    const status = await loan.contract.status()
    if (status == 3) return this.cached.pushLCache(LOANS, loan.contract.address);
    return null
  }

  public async checkNewLoans(epns, users, truefiNetwork, simulate) {
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    if (!users) users = logicOverride && simulate.logicOverride.hasOwnProperty("users") ? simulate.logicOverride.users : [];
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    if(!truefiNetwork) truefiNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("truefiNetwork") ? simulate.logicOverride.truefiNetwork : config.web3MainnetNetwork;
    if(!epns){
      epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);
    }
    const truefi = await sdk.getContract(config.truefiLoanFactoryDeployedContract, config.truefiLoanFactoryDeployedContractABI)
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
      logger.debug('Preparing payload...');
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
          message = data.loans?.length > 1?  "New loans have been posted on truefi, visit to vote" : "A new loan has been posted on truefi, visit to vote";
          payloadMsg = data.loans?.length > 1?  "New loans have been posted on truefi, visit to vote" : "A new loan has been posted on truefi, visit to vote";
          payloadTitle = "Truefi New Loan";
          break;
        default:
          break;
      }

      const tx = await sdk.sendNotification(user, title, message, payloadTitle, payloadMsg, simulate)
      logger.info(tx);
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
}




