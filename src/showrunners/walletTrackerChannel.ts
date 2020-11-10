import { Service, Inject, Container } from 'typedi';
import config from '../config';
import mongoose from 'mongoose';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { truncateSync } from 'fs';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const epnsNotify = require('../helpers/epnsNotifyHelper');

@Service()
export default class WalletTrackerChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
  }

  public async sendMessageToContract(){

    const cache = this.cached;
    const logger = this.logger;

    return await new Promise((resolve, reject) => {

        const walletTrackerChannelAddress = ethers.utils.computeAddress(config.walletTrackerPrivateKey);

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

        epns.contract.channels(walletTrackerChannelAddress)
        .then(async (channelInfo) => {

            // Get Filter
            const filter = epns.contract.filters.Subscribe(walletTrackerChannelAddress)
            const startBlock = channelInfo.channelStartBlock.toNumber();

            epns.contract.queryFilter(filter, startBlock)
            .then(eventLog => {

            // Log the event
            logger.debug("Subscribed Address Found: %o", eventLog.length);

            let allPayloads = []

            // Loop through all addresses in the channel and decide who to send notification
            eventLog.forEach(log => {

                // Get user address
                const user = log.args.user;
                allPayloads.push(
                    this.checkTokenMovement(user, epns.provider)
                      .then((result) => {
                        return result;
                      })
                );

            });
        })
        .catch(err => {
            logger.error("Error retreiving channel start block: %o", err);
            reject(err);
        });

        })
        .catch(err => {
            logger.error("Error retreiving channel start block: %o", err);
            reject(err);
        });
    })
  }

  public async checkTokenMovement(user, provider){
    const logger = this.logger;

    const tokens =[
        { 
            address: '',
            ticker: 'ETH',
        },
        { 
            address: '',
            ticker: 'DAI',
        },
        { 
            address: '',
            ticker: 'BTC',
        },
    ]

    let changedTokens = [];

    tokens.forEach(token => {

        this.getTokenBalance(user, token, provider)
        .then(userToken => {

            this.getUserTokenFromDB(user, token)
            .then(userTokenFromDB => {

                this.compareTokenBalance(userToken, userTokenFromDB)
                .then(res => {
                    if(res.changed){
                        changedTokens.push(userToken)
                    }
                    else{
                        const message = `${user} has no movement in ${token.symbol} token`;
                        logger.info(message)
                    }
                })
            })

        })
    })

    Promise.all(changedTokens)
    .then(async (results) => {
        logger.debug("All Changed Tokens Loaded: %o", results);

        this.getWalletTrackerPayload(user, results)
    })

  }

  public async getTokenBalance(user, token, provider){
    const logger = this.logger;

    if (token.symbol === 'ETH' )
        provider.getBalance(user).then(balance => {

            // balance is a BigNumber (in wei); format is as a sting (in ether)
            var etherBalance = ethers.utils.formatEther(balance);
        
            logger.info("Ether Balance: " + etherBalance);
            return {
                token,
                balance: etherBalance
            }
        });
    else{
        const tokenContract = new ethers.Contract(token.address, config.erc20DeployedContractABI, provider);
        let tokenBalance = tokenContract.balanceOf(token.address)
        return {
            token,
            balance: tokenBalance
        }
    }
  }

  //MONGODB
  public async setUserTokenToDB(user, userToken){
      

  }

  //MONGODB
  public async getUserTokenFromDB(user, token){

  }

  public async compareTokenBalance(userToken, userTokenFromDB){
      if(userToken.balance !== userTokenFromDB.balance)
      return {changed : true}
      else 
      return {changed : false}
  }

  public async getWalletTrackerPayload(user, changedTokens) {
    const logger = this.logger;

    logger.debug('Preparing payload...');

    return await new Promise(async (resolve) => {
    const title = "Wallet Tracker Alert!";
    const message = "";

    const payloadTitle = "Wallet Tracker Alert!";
    const payloadMsg = "";

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





   // setHashCache("ETH", "harsh", 20)

                // setHashCache("tokens", "harsh", {})

                // setHashCache("tokens", "harsh", {"0xy": 10, "0zy": 20})

                // getHashCache(hash: String, key: String)
 




// setting token balance for each user


// UserToken.find({user: user)).populate("token")

                // this.tokenMovement(user)
                // .then(res => {
                //     if(res.changed){
                //         changedTokensInfo = res.changedTokensInfo
                //     }
                //     else{
                //         const message = `${user} has no movement in ${token.symbol} token`;
                //         logger.info(message)
                //         resolve({
                //             success: message
                //           });
                //     }

                // })
                // .catch(err => {
                //     logger.error("Error retreiving channel start block: %o", err);
                //     reject(err);
                // });



public async onSubscription(userAddress){

    const cache = this.cached;
    const logger = this.logger;

    logger.info('Getting ethBalance');

    return await new Promise((resolve, reject) => {

        // Call Helper function to get interactableContracts
        const epns = epnsNotify.getInteractableContracts(
        config.web3RopstenNetwork,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
            etherscanAPI: config.etherscanAPI,
            infuraAPI: config.infuraAPI,
            apchemyAPI: config.apchemyAPI
        },
        config.ensDomainExpiryPrivateKey,                                       // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
        );
        
       this.getEthBalance(userAddress, epns.provider)
       .then(result => {
           this.setUserTokenInfo(userAddress, result)



           //store the result in MONGODB
//            {token, user, balance}
//             setHashCache("ETH", "harsh", 20)

       })

        
  
        // let tokenAddresses = [];

        // for(let i=0; i<tokenAddresses.length; i++){

        //     let tokenAddress = tokenAddresses[i]

        //     let tokenContract = new ethers.Contract(tokenAddress, config.erc20DeployedContractABI, provider);
    
        //     let fromBlock = 0
        //     let totalSent= 0;
        //     let totalReceived = 0;
        //     let fromTx, toTx;

        //     // tokenContract.queryFilter(startBlock, latestBlock)

                // List all token transfers *from* userAddress
        //     fromTx = tokenContract.filters.Transfer(userAddress)

        //     // List all token transfers *to* userAddress
        //     toTx = tokenContract.filters.Transfer(null, userAddress)

        //     console.log(fromTx)
        //     console.log(toTx)

        // }

       
    })


  }






  public async getTokenBalanceFromDB(userAddress: string, tokenAddress: string): Promise<{}> {
    // this.logger.silly('Get gas price');
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      let userTokenData  
      if (tokenAddress) {
        userTokenData = await this.UserTokenModel.find({ user: userAddress, token: tokenAddress }).populate("token")
      } else {
        userTokenData = await this.UserTokenModel.find({ user: userAddress }).populate("token")
      }
       
      const userTokenBalance = {}
      userTokenData.map(usertokens => {
        return userTokenBalance[usertokens.token.address] = usertokens.balance
      })
      return userTokenBalance;
    } catch (error) {
      console.log(error);
    }
  }


  public async addTokenToDB(symbol: string, address: string, decimals: number): Promise<{}> {
    // this.logger.silly('Get gas price');
    this.TokenModel = Container.get('TokenModel');
    try {
      const token = await this.TokenModel.create({ 
        symbol,
        address,
        decimals
       })
      return token;
    } catch (error) {
      console.log(error);
    }
  }

  public async addUserTokenToDB(user: string, token: mongoose.Types.ObjectId): Promise<{}> {
    // this.logger.silly('Get gas price');
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.create({ 
        user,
        token,
       })
      return userToken;
    } catch (error) {
      console.log(error);
    }
  }

  public async getTokenByAddress(tokenAddress: string): Promise<{}> {
    // this.logger.silly('Get gas price');
    this.TokenModel = Container.get('TokenModel');
    try {
      const token = await this.TokenModel.findOne({token: tokenAddress})
      return token;
    } catch (error) {
      console.log(error);
    }
  }
}
