import { Service, Inject, Container } from 'typedi';
import config from '../config';
import mongoose from 'mongoose';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers, logger } from 'ethers';
import { truncateSync } from 'fs';
import { reject } from 'lodash';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const epnsNotify = require('../helpers/epnsNotifyHelper');

const SUPPORTED_TOKENS = {
  'ETH':{
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ticker: 'ETH',
      decimals: 18
  },
  'DAI':{
      address: '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108',
      ticker: 'DAI',
      decimals: 18
  },
  'cUSDT':{
    address: '0x135669c2dcbd63f639582b313883f101a4497f76',
    ticker: 'cUSDT',
    decimals: 8
  },
}

const NETWORK_TO_MONITOR = config.web3RopstenNetwork;

@Service()
export default class WalletTrackerChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
  }

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
      web3network,                                                                // Network for which the interactable contract is req
      {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
      },
      config.walletTrackerPrivateKey,                                       // Private Key of the Wallet sending Notification
      config.deployedContract,                                                // The contract address which is going to be used
      config.deployedContractABI                                              // The contract abi which is going to be useds
    );
  }

  public getERC20InteractableContract(web3network, tokenAddress) {
    // Get Contract
    // let contract = [];
    // contract["interact"] = 
    return epnsNotify.getInteractableContracts(
      web3network,                                                                // Network for which the interactable contract is req
      {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
      },
      null,                                                                   // No need to write on contract
      tokenAddress,                                                           // The contract address which is going to be used
      config.erc20DeployedContractABI                                        // The contract abi which is going to be useds
    );
    // contract["address"]= tokenAddress
    // return contract
  }

  public getSupportedERC20sArray(web3network) {
    const logger = this.logger;
    let erc20s = [];

    for (const ticker in SUPPORTED_TOKENS) {
      erc20s[`${ticker}`] = this.getERC20InteractableContract(web3network, SUPPORTED_TOKENS[ticker].address);
    }

    return erc20s;
  }

  public async sendMessageToContract() {
    const cache = this.cached;
    const logger = this.logger;

    return await new Promise((resolve, reject) => {

      const walletTrackerChannel = ethers.utils.computeAddress(config.walletTrackerPrivateKey);

      // Call Helper function to get interactableContracts
      const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
      const interactableERC20s = this.getSupportedERC20sArray(NETWORK_TO_MONITOR);
      logger.info("interactableERC20s: %o", interactableERC20s)

      epns.contract.channels(walletTrackerChannel)
        .then(async (channelInfo) => {
          // Get Filter
          const filter = epns.contract.filters.Subscribe(walletTrackerChannel)
          const startBlock = channelInfo.channelStartBlock.toNumber();

          epns.contract.queryFilter(filter, startBlock)
            .then(eventLog => {
              // Log the event
              logger.debug("Subscribed Address Found: %o", eventLog.length);

              let allPayloads = []
              // Loop through all addresses in the channel and decide who to send notification
              let promises = eventLog.map(log => {

                return new Promise((resolve) => {
                  // Get user address
                  const user = log.args.user;
                  logger.info("user: %o", user)

                  this.checkWalletMovement(user, NETWORK_TO_MONITOR, interactableERC20s)
                  .then((result) => {
                    // logger.info(" For User: %o | checkTokenMovement result: :%o ", user, result)

                    resolve(result)
                  })
                });
              });

              // Wait for all promises to come
              Promise.all(promises)
                .then(async (results) => {
                  logger.debug("All Transactions Loaded: %o", results);

                  for (const object of results) {
                    if (object.success) {
                      // Send notification
                      const ipfshash = object.ipfshash;
                      const payloadType = object.payloadType;
                      const user = object.user

                      logger.info("Wallet: %o | Hash: :%o | Sending Data...", user, ipfshash);

                      const storageType = 1; // IPFS Storage Type
                      const txConfirmWait = 1; // Wait for 0 tx confirmation

                      // Send Notification
                      await epnsNotify.sendNotification(
                        epns.signingContract,                                           // Contract connected to signing wallet
                        user,                                           // Recipient to which the payload should be sent
                        payloadType,                                                    // Notification Type
                        storageType,                                                    // Notificattion Storage Type
                        ipfshash,                                                       // Notification Storage Pointer
                        txConfirmWait,                                                  // Should wait for transaction confirmation
                        logger                                                          // Logger instance (or console.log) to pass
                      ).then ((tx) => {
                        logger.info("Transaction successful: %o | Notification Sent", tx.hash);
                        logger.info("🙌 Wallet Tracker Channel Logic Completed!");
                        resolve(tx);
                      })
                      .catch (err => {
                        logger.error("🔥Error --> sendNotification(): %o", err);
                        reject(err);
                      });

                      try {
                        let tx = await epns.signingContract.sendMessage(walletTrackerChannel, payloadType, ipfshash, 1);
                        logger.info("Transaction sent: %o", tx);
                      }
                      catch (err) {
                        logger.error("Unable to complete transaction, error: %o", err);
                      }
                    }
                  }
                })
                .catch(err => {
                  logger.error("Error retreiving all promises", err);
                  reject(err);
                });
            })
            .catch(err => {
              logger.error("Error retreiving Subscriber event log: %o", err);
              reject(err);
            });
        })
        .catch(err => {
            logger.error("Error retreiving channel info: %o", err);
            reject(err);
        });
    })
  }

  public async checkWalletMovement(user, networkToMonitor, interactableERC20s) {
    const logger = this.logger;

    // check and recreate provider mostly for routes
    if (!interactableERC20s) {
      logger.info("Mostly coming from routes... rebuilding interactable erc20s");
      //need token address
      interactableERC20s = this.getSupportedERC20sArray(networkToMonitor);
      logger.info("Rebuilt interactable erc20s --> %o", interactableERC20s);
    }

    return new Promise((resolve) => {
      let changedTokens = [];

      // let promises = SUPPORTED_TOKENS.map(token => {
      let promises = [];
      for (const ticker in SUPPORTED_TOKENS) {
        let promise = ()=> {
          this.checkTokenMovement(user, networkToMonitor, ticker, interactableERC20s)
        }
        promises.push(promise)
      }

      Promise.all(promises)
      .then(results=> {
        // logger.info('results: %o', results)
        changedTokens = results.filter(token => token.changed ===true)
        // logger.info('changedTokens: %o', changedTokens)
        if(changedTokens.length>0){
          this.getWalletTrackerPayload(changedTokens)
          .then(payload =>{
            epnsNotify.uploadToIPFS(payload, logger)
            .then(async (ipfshash) => {
              // Sign the transaction and send it to chain
              // const walletAddress = ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey);
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
        }
        else{
          resolve({
            success: false,
            data: "No token movement for wallet: " + user
          })
        }

      })
    })

  }

  public async checkTokenMovement(user, networkToMonitor, ticker, interactableERC20s) {
    const logger = this.logger;

    // check and recreate provider mostly for routes
    if (!interactableERC20s) {
      logger.info("Mostly coming from routes... rebuilding interactable erc20s");
      //need token address
      interactableERC20s = this.getSupportedERC20sArray(networkToMonitor);
      logger.info("Rebuilt interactable erc20s --> %o", interactableERC20s);
    }

    return new Promise((resolve) => {

    this.getTokenBalance(user, networkToMonitor, ticker, interactableERC20s[ticker])
    .then(userToken => {

      // logger.info('userToken: %o', userToken)
      this.getTokenByTicker(ticker)
      .then(tokenDataFromDB=>{
        // logger.info('tokenDataFromDB: %o', tokenDataFromDB)

        this.getTokenBalanceFromDB(user, tokenDataFromDB._id)
        .then(userTokenArrayFromDB =>{
          // logger.info('userTokenArrayFromDB: %o', userTokenArrayFromDB)
          // logger.info('userTokenArrayFromDB.length: %o', userTokenArrayFromDB.length)
          if(userTokenArrayFromDB.length == 0){

            this.addUserTokenToDB(user, tokenDataFromDB._id, userToken.balance)
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
                this.updateUserTokenBalance(user, tokenDataFromDB._id, resultToken.tokenBalance)
              }
              resolve(resultToken)
            })
          }
        })
      })
    })
  })
  }

  public async getTokenBalance(user, networkToMonitor, ticker, tokenContract){
    const logger = this.logger;

    if(!tokenContract){
      tokenContract = this.getERC20InteractableContract(networkToMonitor, SUPPORTED_TOKENS[ticker].address)
    }

    return await new Promise((resolve, reject) => {

      if (ticker === 'ETH' ){
        tokenContract.contract.provider.getBalance(user).then(balance => {
          // logger.info("wei balance" + balance);
          let etherBalance

          // balance is a BigNumber (in wei); format is as a string (in ether)
          etherBalance = ethers.utils.formatEther(balance);

          // logger.info("Ether Balance: " + etherBalance);
          let tokenInfo = {
            user,
            ticker,
            balance: etherBalance
          }
          console.log(tokenInfo);
          resolve (tokenInfo)
        });
      }

      else{
        let tokenBalance
        tokenContract.contract.balanceOf(user)
        .then(res=> {
          let decimals = SUPPORTED_TOKENS[ticker].decimals
          let rawBalance = Number(Number(res));
          tokenBalance = Number(rawBalance/Math.pow(10, decimals)).toLocaleString()
          // logger.info("tokenBalance: " + tokenBalance);
          let tokenInfo = {
            user,
            ticker,
            balance: tokenBalance
          }
          console.log(tokenInfo);
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
        increased: false,
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

    let changedTokensJSON = JSON.stringify(changedTokens)
    // logger.info('changedTokensJSON: %o', changedTokensJSON)


    return await new Promise(async (resolve) => {
    const title = "Wallet Tracker Alert!";
    const message = "Token Movement in the last one hour!";

    const payloadTitle = "Wallet Tracker Alert!";
    const payloadMsg = changedTokensJSON;

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

  //MONGODB
  public async getTokenBalanceFromDB(userAddress: string, tokenID: string): Promise<{}> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      let userTokenData
      if (tokenID) {
        userTokenData = await this.UserTokenModel.find({ user: userAddress, token: tokenID }).populate("token")
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
  public async addUserTokenToDB(user: string, token: mongoose.Types.ObjectId, balance: String): Promise<{}> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.create({
        user,
        token,
        balance
      })
      // logger.info('userTokenSetToDB: %o', userToken)
      return userToken;
    } catch (error) {
      logger.debug('addUserTokenToDB Error: %o', error);
    }
  }

  //MONGODB
  public async updateUserTokenBalance(user: string, token: mongoose.Types.ObjectId, balance: String): Promise<{}> {
    const logger = this.logger;
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.findOneAndUpdate(
        { user, token },
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
  public async getTokenByTicker(ticker: string): Promise<{}> {
    // public async getTokenByAddress(tokenAddress: string): Promise<{}> {
    const logger = this.logger;
    this.TokenModel = Container.get('TokenModel');
    try {
      const token = await this.TokenModel.findOne({ticker: ticker})
      // const token = await this.TokenModel.findOne({address: tokenAddress})
      console.log(token)

      return token;
    } catch (error) {
      logger.debug('getTokenByTicker Error: %o', error);
    }
  }

  //MONGODB
  public async addTokenToDB(ticker: string, address: string, decimals: number): Promise<{}> {
    const logger = this.logger;
    this.TokenModel = Container.get('TokenModel');
    try {
      const token = await this.TokenModel.create({
        ticker,
        address,
        decimals
      })
      return token;
    } catch (error) {
      logger.debug('addTokenToDB Error: %o', error);
    }
  }

  //To add all the tokens we support, to MONGODB
  public async addTokens() {
    let tokenPromises = [];
    for (const ticker in SUPPORTED_TOKENS) {
      tokenPromises.push(this.addTokenToDB(ticker, SUPPORTED_TOKENS[ticker].address, SUPPORTED_TOKENS[ticker].decimals))
    }
    const results = await Promise.all(tokenPromises)
    return {success: "success", data: results}
  }

  //MONGODB
  public async clearTokenDB(): Promise<boolean> {
    const logger = this.logger;
    this.TokenModel = Container.get('TokenModel');
    try {
      await this.TokenModel.deleteMany({})
      return true;
    } catch (error) {
      logger.debug('clearTokenDB Error: %o', error);
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
