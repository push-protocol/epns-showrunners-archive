import { Service, Inject, Container } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import mongoose from 'mongoose';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';
import PQueue from 'p-queue';
import { ethers, logger } from 'ethers';
import { truncateSync } from 'fs';
import { reject } from 'lodash';
const queue = new PQueue();
// await queue.onIdle();

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
import epnsNotify from '../helpers/epnsNotifyHelper';

const SUPPORTED_TOKENS = {
  'ETH':{
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ticker: 'ETH',
      decimals: 18
  },
  // 'DAI':{
  //     address: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108',
  //     ticker: 'DAI',
  //     decimals: 18
  // },
  // 'cUSDT':{
  //   address: '0x135669c2dcbd63f639582b313883f101a4497f76',
  //   ticker: 'cUSDT',
  //   decimals: 8
  // },
  // 'UNI':{
  //   address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  //   ticker: 'UNI',
  //   decimals: 18
  // },
}

const CUSTOMIZABLE_SETTINGS = {
  'precision': 3,
  'ticker': 5,
}

const NETWORK_TO_MONITOR = config.web3RopstenNetwork;

@Service()
export default class WalletTrackerChannel {
  running: any;
  UserTokenModel: any;
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
    let running = false;
    // this.running =  false;
  }

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
      web3network,                                                             // Network for which the interactable contract is req
      {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
      },
      channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1'],                                          // Private Key of the Wallet sending Notification
      config.deployedContract,                                                // The contract address which is going to be used
      config.deployedContractABI                                              // The contract abi which is going to be useds
    );
  }

  public getERC20InteractableContract(web3network, tokenAddress) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
      web3network,                                                             // Network for which the interactable contract is req
      {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
      },
      null,                                                                   // No need to write on contract
      tokenAddress,                                                           // The contract address which is going to be used
      config.erc20DeployedContractABI                                        // The contract abi which is going to be useds
    );
  }

  public getSupportedERC20sArray(web3network) {
    const logger = this.logger;
    let erc20s = [];

    for (const ticker in SUPPORTED_TOKENS) {
      erc20s[`${ticker}`] = this.getERC20InteractableContract(web3network, SUPPORTED_TOKENS[ticker].address);
    }

    return erc20s;
  }

  public async sendMessageToContract(simulate) {
    const cache = this.cached;
    const logger = this.logger;

    // Ignore call if this is already running
    if (this.running) {
      logger.debug("Wallet Tracker instance is already running! Skipping...");
      return;
    }
    this.running = true;

    const walletTrackerChannel = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1']);

    // Call Helper function to get interactableContracts
    const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
    const interactableERC20s = this.getSupportedERC20sArray(NETWORK_TO_MONITOR);

    const channelInfo = await epns.contract.channels(walletTrackerChannel);
    // Get Filter
    const filter = epns.contract.filters.Subscribe(walletTrackerChannel);
    const startBlock = channelInfo.channelStartBlock.toNumber();

    const eventLog = await epns.contract.queryFilter(filter, startBlock);
    // Log the event
    logger.debug("Subscribed Address Found: %o", eventLog.length);

    let allPayloads = []

    for (let index = 0; index < eventLog.length; index++) {
      const log = eventLog[index];
      const user = log.args.user;
      // logger.info("user: %o", user)
      await queue.add(() => this.processAndSendNotification(epns, user, NETWORK_TO_MONITOR, simulate, interactableERC20s));
      logger.info(" Added processAndSendNotification for user:%o ", user)
    }
    await queue.onIdle();
    this.running = false;
    logger.debug("Done for all");
  }

  public async processAndSendNotification(epns, user, NETWORK_TO_MONITOR, simulate, interactableERC20s) {
    const object = await this.checkWalletMovement(user, NETWORK_TO_MONITOR, simulate, interactableERC20s);
    if (object.success) {
        const user = object.user
        let res = await this.getPayloadHash(user, object.changedTokens, simulate)
        logger.info('IPFS Hash: %o', res)
        logger.info('Object: %o', object)

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
        logger.info("🙌 Wallet Tracker Channel Logic Completed!");
      }
      else{
        logger.info(object)
      }
  }

  public async checkWalletMovement(user, networkToMonitor, simulate, interactableERC20s) {
    const logger = this.logger;

    // check and return if the wallet is the channel owner
    if (this.isChannelOwner(user)) {
      return {
        success: false,
        data: "Channel Owner User: " + user
      };
    }

    // check and recreate provider mostly for routes
    if (!interactableERC20s) {
      logger.info("Mostly coming from routes... rebuilding interactable erc20s");
      //need token address
      interactableERC20s = this.getSupportedERC20sArray(networkToMonitor);
      logger.info("Rebuilt interactable erc20s --> %o", interactableERC20s);
    }

    let changedTokens = [];

    // let promises = SUPPORTED_TOKENS.map(token => {
    let promises = [];
    for (const ticker in SUPPORTED_TOKENS) {
      promises.push(this.checkTokenMovement(user, networkToMonitor, ticker, interactableERC20s, simulate))
    }

    const results = await Promise.all(promises)
    changedTokens = results.filter(token => token.resultToken.changed === true)
    // logger.info('changedTokens: %o', changedTokens)
    if(changedTokens.length>0){
      return {
        success: true,
        user,
        changedTokens
      }
    }
    else{
      return {
        success: false,
        data: "No token movement for wallet: " + user
      }
    }
  }

  public isChannelOwner(user) {
    if (ethers.utils.computeAddress(channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1']) == user) {
      return true;
    }

    return false;
  }

  public async checkTokenMovement(user, networkToMonitor, ticker, interactableERC20s, simulate) {
    const logger = this.logger;

    // check and recreate provider mostly for routes
    if (!interactableERC20s) {
      logger.info("Mostly coming from routes... rebuilding interactable erc20s");
      //need token address
      interactableERC20s = this.getSupportedERC20sArray(networkToMonitor);
      logger.info("Rebuilt interactable erc20s --> %o", interactableERC20s);
    }

    return new Promise((resolve) => {

    this.getTokenBalance(user, networkToMonitor, ticker, interactableERC20s[ticker], simulate)
    .then(userToken => {

      // logger.info('userToken: %o', userToken)
      this.getTokenBalanceFromDB(user, ticker)
      .then(userTokenArrayFromDB =>{
        // logger.info('userTokenArrayFromDB: %o', userTokenArrayFromDB)
        // logger.info('userTokenArrayFromDB.length: %o', userTokenArrayFromDB.length)
        if(userTokenArrayFromDB.length == 0){
          this.addUserTokenToDB(user, ticker, userToken.balance)
          .then(addedToken =>{
            resolve({
              ticker,
              resultToken: {
                changed: false
              },
              addedToken,
            })
          })
        }
        else{
          let userTokenFromDB
          userTokenArrayFromDB.map(usertoken => {
            return userTokenFromDB = usertoken
          })

          // logger.info('userTokenFromDB: %o', userTokenFromDB)
          let tokenBalanceStr= userToken.balance
          let tokenBalance= Number(tokenBalanceStr.replace(/,/g, ''))
          let tokenBalanceFromDBStr= userTokenFromDB.balance
          let tokenBalanceFromDB= Number(tokenBalanceFromDBStr.replace(/,/g, ''))

          this.compareTokenBalance(tokenBalance, tokenBalanceFromDB)
          .then(resultToken => {
            // logger.info('resultToken: %o', resultToken)
            if(resultToken.changed){
              this.updateUserTokenBalance(user, ticker, resultToken.tokenBalance)
            }
            resolve({
              ticker,
              resultToken
            })
          })
        }
      })
    })
  })
  }

  public async getPayloadHash(user, changedTokens, simulate) {
    const logger = this.logger;

    return new Promise((resolve) => {

      this.getWalletTrackerPayload(changedTokens)
      .then(payload =>{
        epnsNotify.uploadToIPFS(payload, logger, simulate)
        .then(async (ipfshash) => {
          // Sign the transaction and send it to chain
          logger.info("ipfs hash generated: %o for Wallet: %s, sending it back...", ipfshash, user);

          resolve({
            success: true,
            user,
            ipfshash,
            payloadType: parseInt(payload.data.type)
          });
        })
        .catch (err => {
          logger.error("Unable to obtain ipfshash for wallet: %s, error: %o", user, err)
          resolve({
            success: false,
            data: "Unable to obtain ipfshash for wallet: " + user + " | error: " + err
          });
        });
      })
    })
  }

  public async getTokenBalance(user, networkToMonitor, ticker, tokenContract, simulate){
    const logger = this.logger;

    if(!tokenContract){
      tokenContract = this.getERC20InteractableContract(networkToMonitor, SUPPORTED_TOKENS[ticker].address)
    }

    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const simulateApplyToAddr = logicOverride && simulate.logicOverride.hasOwnProperty("applyToAddr") ? simulate.logicOverride.applyToAddr : false;
    const simulateRandomEthBal = logicOverride && (simulateApplyToAddr == user || !simulateApplyToAddr) && simulate.logicOverride.hasOwnProperty("randomEthBalance") ? simulate.logicOverride.randomEthBalance : false;
    const simulateRandomTokenBal = logicOverride && (simulateApplyToAddr == user || !simulateApplyToAddr) && simulate.logicOverride.hasOwnProperty("randomTokenBalance") ? simulate.logicOverride.randomTokenBalance : false;

    return await new Promise((resolve, reject) => {

      if (ticker === 'ETH' ){
        tokenContract.contract.provider.getBalance(user).then(balance => {
          // logger.info("wei balance" + balance);
          let etherBalance;

          if (simulateRandomEthBal) {
            balance = ethers.utils.parseEther((Math.random() * 100001 / 100).toString());
            logger.info("Simulating Random Ether Balance: %s" + ethers.utils.formatEther(balance));
          }

          // balance is a BigNumber (in wei); format is as a string (in ether)
          etherBalance = ethers.utils.formatEther(balance);

          // logger.info("Ether Balance: " + etherBalance);
          let tokenInfo = {
            user,
            ticker,
            balance: etherBalance
          }
          resolve (tokenInfo)
        });
      }

      else{
        let tokenBalance
        tokenContract.contract.balanceOf(user)
        .then(res=> {
          let decimals = SUPPORTED_TOKENS[ticker].decimals

          // Simulate random balance
          if (simulateRandomTokenBal) {
            const random = ethers.BigNumber.from(Math.floor(Math.random() * 10000));
            const randBal = ethers.BigNumber.from(10).pow(SUPPORTED_TOKENS[ticker].decimals - 2);
            res = random.mul(randBal);
            logger.info("Simulating Random Token Balance [%s]: %s", SUPPORTED_TOKENS[ticker].ticker, res.toString());
          }

          let rawBalance = Number(Number(res));

          tokenBalance = Number(rawBalance/Math.pow(10, decimals)).toLocaleString()
          // logger.info("tokenBalance: " + tokenBalance);
          let tokenInfo = {
            user,
            ticker,
            balance: tokenBalance
          }
          resolve (tokenInfo)
        })
      }
    })
  }

  public async compareTokenBalance(tokenBalance, tokenBalanceFromDB){
    let tokenDifference = tokenBalance-tokenBalanceFromDB
    let resultToken

    if(tokenDifference === 0){
      resultToken = {
        changed: false,
        tokenDifference: tokenDifference,
        tokenBalance,
      }
      return resultToken
    }
    else if (tokenDifference>0){
      resultToken = {
        changed: true,
        increased: true,
        tokenDifference: tokenDifference,
        tokenBalance,
      }
      return resultToken
    }
    else if(tokenDifference<0){
      resultToken = {
        changed: true,
        increased: false,
        tokenDifference: tokenDifference,
        tokenBalance,
      }
      return resultToken
    }
  }

  public async getWalletTrackerPayload(changedTokens) {
    const logger = this.logger;

    logger.debug('Preparing payload...');

    return await new Promise(async (resolve) => {
      const title = "Wallet Tracker Alert!";
      const message = "Crypto Movement from your wallet detected!";

      const payloadTitle = "Crypto Movement Alert!";
      const payloadMsg = this.prettyTokenBalances(changedTokens);

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

  // Pretty format token balances
  public prettyTokenBalances(changedTokens) {
    const h1 = "[d:Summary & Latest Balance]\n---------";

    let body = '';

    changedTokens.map(token => {
      // convert to four decimal places at max
      const precision = CUSTOMIZABLE_SETTINGS.precision;

      let change = parseFloat(token.resultToken.tokenDifference).toFixed(precision);
      let ticker = token.ticker.trim() + ":";
      const padding = CUSTOMIZABLE_SETTINGS.ticker - ticker.length;
      const spaces = ("               ").slice(-padding);

      if (padding > 0) {
        ticker = ticker + spaces;
      }

      ticker = change >= 0 ? `[➕] [d:${ticker}]` : `[➖] [t:${ticker}]`;
      const newBal = parseFloat(token.resultToken.tokenBalance).toFixed(precision);
      const prevBal = parseFloat(parseFloat(newBal) + parseFloat(newBal)).toFixed(precision);
      change = change >= 0 ? "+" + change : change;
      const sign = change.slice(0, 1);
      const unsignedChange = change.slice(1);

      const formatter = change >= 0 ? "[d:" : "[t:";
      body = `${body}\n${ticker}  [b:${newBal}] ${formatter}${token.ticker}] [[dg:${sign}${unsignedChange} ${token.ticker}]]`;
    })

    const prettyFormat = `${h1}\n${body}[timestamp: ${Math.floor(new Date() / 1000)}]`;
    logger.info('Pretty Formatted Token Balance \n%o', prettyFormat);

    return prettyFormat;
  }

  //MONGODB
  public async getTokenBalanceFromDB(userAddress: string, ticker: string): Promise<{}> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      let userTokenData
      if (ticker) {
        userTokenData = await this.UserTokenModel.find({ user: userAddress, ticker }).populate("token")
      } else {
        userTokenData = await this.UserTokenModel.find({ user: userAddress }).populate("token")
      }

      // logger.info('userTokenDataDB: %o', userTokenData)
      return userTokenData
    } catch (error) {
      logger.debug('getTokenBalanceFromDB Error: %o', error);
    }
  }

  //MONGODB
  public async addUserTokenToDB(user: string, ticker: string, balance: String): Promise<{}> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.create({
        user,
        ticker,
        balance
      })
      // logger.info('addUserTokenToDB: %o', userToken)
      return userToken;
    } catch (error) {
      logger.debug('addUserTokenToDB Error: %o', error);
    }
  }

  //MONGODB
  public async updateUserTokenBalance(user: string, ticker: string, balance: string): Promise<{}> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.findOneAndUpdate(
        { user, ticker },
        { balance },
        { safe: true, new: true }
      );
      logger.info('updatedUserToken: %o', userToken)
      return userToken;
    } catch (error) {
      logger.debug('updateUserTokenBalance Error: %o', error);
    }
  }

  //MONGODB
  public async clearUserTokenDB(): Promise<boolean> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      await this.UserTokenModel.deleteMany({})
      return true;
    } catch (error) {
      logger.debug('clearUserTokenDB Error: %o', error);
    }
  }
}
