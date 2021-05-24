// @name: Debug
// @version: 1.0.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers, Wallet } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
import epnsNotify from '../helpers/epnsNotifyHelper';
import { database } from 'firebase-admin';
import { resolve } from 'dns';
const gr = require('graphql-request')
const { request, gql } = gr;

const NETWORK_TO_MONITOR = config.web3RopstenNetwork;

@Service()
export default class Debug {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        channelWalletsInfo.walletsKV['ensDomainExpiryPrivateKey_1'],            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );
  }

  // To form and write to smart contract
  public async trackSendNotification(simulate) {
    const logger = this.logger;
    logger.debug('Tracking SendNotification events... ');

    return await new Promise(async(resolve, reject) => {

      const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);

      // const WALLETS = channelWalletsInfo.wallets.reduce((initial, value) => {
      //   Object.keys(value).map(key => initial[key] = { wallet: new Wallet(value[key], epns.provider) })
      //   return initial;
      // }, {})

      // for (const [name, value] of Object.entries(WALLETS)) {
      //   logger.info(`checking balance for ${name} wallet..`); 
      //   const balance = ethers.utils.formatEther(await value.wallet.getBalance())
      //   logger.info(`balance for ${name} wallet is ${balance.toString()}`); 
       
      // }
      // logger.info(`done with all wallets..`); 

      // const bal = await epns.provider.getBalance(channel)
      // logger.info('bal: %o ', bal);
      // const balance = ethers.utils.formatEther(bal)
      // logger.info('balance: %o ', balance);


        const channel = await ethers.utils.computeAddress(channelWalletsInfo.walletsKV['btcTickerPrivateKey_1']);
        const startBlock = await epns.contract.channels(channel)
        .then(channelInfo =>{
          const start = channelInfo.channelStartBlock.toNumber();
          return(start)
        })
        .catch(err => {
          logger.error("🔥 Error : startBlock")
          return(err)
        })

        logger.info('channelAddress: %o', channel)
        logger.info('startBlock: %o', startBlock)

        const filter = epns.contract.filters.SendNotification(channel, null, null)
        let logs = []

        logger.debug('Extracting event data... ');

        await epns.contract.queryFilter(filter, startBlock, 'latest')
        .then(eventLog => {
        eventLog.forEach((log) => {
          logs.push(this.extractEventData(log, simulate))
        });
        })

        Promise.all(logs)
        .then(async logs => {
          await logs.sort((a,b)=>a.blockNumber - b.blockNumber)
          // await logs.sort((a,b)=>a.timestamp - b.timestamp)
          await logs.forEach(log => {
            // logger.info('channelAddress: %o | recipient: %o', log.channelAddress, log.recipientAddress);
            // logger.info("transactionHash: %o | blockNumber: %o", log.transactionHash, log.blockNumber);
            logger.info("transactionHash: %o | time: %o", log.transactionHash, log.time);
            // logger.info("transactionHash: %o | timestamp: %o | time: %o", log.transactionHash, log.timestamp, log.time);
          })
          resolve('success!')
        })
        .catch(log => {
          logger.info("log: %o", log);
        })
    });
  }

  public async extractEventData(log, simulate) {
    const logger = this.logger;
    // logger.info("log: %o", log);

    return await new Promise(async(resolve, reject) => {

      const channelAddress = log.args.channel;
      const recipientAddress = log.args.recipient;
      const identity = log.args.identity;

        // resolve({
        //   channelAddress,
        //   recipientAddress,
        //   blockNumber: log.blockNumber,
        //   transactionHash: log.transactionHash
        // })
      
      const getTransactionReceipt = log.getTransactionReceipt();
      const getBlock = log.getBlock();

      log.getBlock()
      .then(block => {

        var a = new Date(block.timestamp * 1000);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var year = a.getFullYear();
        var month = months[a.getMonth()];
        var date = a.getDate();
        var hour = a.getHours();
        var min = a.getMinutes();
        var sec = a.getSeconds();
        var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;

        resolve({
          channelAddress,
          recipientAddress,
          timestamp: block.timestamp,
          time,
          transactionHash: log.transactionHash
        })

        // logger.info('Transaction Hash: %o | Time: %o', log.transactionHash, time);
        // logger.info("channelAddress: %o | recipientAddress: %o | timestamp: %o", channelAddress, recipientAddress, block.timestamp);

      })
      .catch(err => {
        // logger.error('🔥 Error : No getBlock()');
        resolve({
          channelAddress,
          recipientAddress,
          transactionHash: log.transactionHash
        })
      })
     
    });
  }

}
