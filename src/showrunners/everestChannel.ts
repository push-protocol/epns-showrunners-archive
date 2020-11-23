import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { result } from 'lodash';
import { resolve } from 'dns';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const epnsNotify = require('../helpers/epnsNotifyHelper');
const THRESHOLD_FLAG = 'threshold_flag';
const BLOCK_NUMBER = 'block_number';

@Service()
export default class EverestChannel {
    constructor(
        @Inject('logger') private logger,
        @Inject('cached') private cached,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
    ) {
        //initializing cache
    this.cached.setCache(THRESHOLD_FLAG, false);
    this.cached.setCache(BLOCK_NUMBER, 0);
    }

    public async getEverestInteractableContract(){
        return epnsNotify.getInteractableContracts(
            config.web3MainnetNetwork,                                              // Network for which the interactable contract is req
            {                                                                       // API Keys
                etherscanAPI: config.etherscanAPI,
                infuraAPI: config.infuraAPI,
                alchemyAPI: config.alchemyAPI
            },
            config.everestPrivateKey,                                                // Private Key of the Wallet sending Notification
            config.everestDeployedContract,                                          // The contract address which is going to be used
            config.everestDeployedContractABI                                        // The contract abi which is going to be useds
        );
    }

  // To form and write to smart contract
    public async sendMessageToContract(simulate) {
        const logger = this.logger;
        const cache = this.cached;
        logger.debug('Checking for challenged  projects addresses... ');

        const everest = await this.getEverestInteractableContract()

        return await new Promise((resolve, reject) => {
    
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
        
            let allTransactions = [];

            this.checkMemberChallengedEvent(everest)
            .then((info) => {
                if(!info.change){
                    const message = 'Threshold initailized'

                    resolve({
                        success: message
                    });

                    logger.info(message)

                }
                else{
                    if(info.lastBlock > info.blockChecker){
                        cache.setCache(BLOCK_NUMBER, info.lastBlock);
                         for(let i = 1; i < info.eventCount; i++) {
                            let userAddress = info.log[i].args.member

                            allTransactions.push(
                            this.getTransaction(userAddress, simulate) 
                                .then(results => {
                                    return results;
                                })
                            )
                        }

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
                                        logger,
                                        simulate                                                        // Passing true will not allow sending actual notification                                                          // Logger instance (or console.log) to pass
                                    ).then ((tx) => {
                                        logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                                        logger.info("🙌 Evest Ticker Channel Logic Completed!");
                                        resolve(tx);
                                    })          
                                    .catch (err => {
                                        logger.error("🔥Error --> sendNotification(): %o", err);
                                        reject(err);
                                    });
                                    try {
                                        let tx = await epns.signingContract.sendMessage(wallet, payloadType, ipfshash, 1);
                                        logger.info("Transaction sent: %o", tx);
                                    }
                                    catch (err) {
                                        logger.error("Unable to complete transaction, error: %o", err);
                                    }
                                }
                            }
                        })
                    }
                    else {
                        const message = "No new challenge has been made"
                        
                        resolve({
                            success: message
                        });
                        
                        logger.info(message)
                    }
                }
            })
            .catch(err => {
                logger.error(err);
                reject("🔥Error --> Unable to obtain challenged members event: %o", err);
            });
        })
    }

    public async checkMemberChallengedEvent(everest){
        const logger = this.logger;
        if(!everest){
            everest = await this.getEverestInteractableContract()
          }
       
        const cache = this.cached;
        logger.debug('Getting eventLog,eventCount,blocks...');

        return await new Promise(async(resolve, reject) => {
            const filter = everest.contract.filters.MemberChallenged();
            const newBlock = await cache.getCache(BLOCK_NUMBER);
            const fromBlock = Number(newBlock)
            everest.contract.queryFilter(filter,fromBlock,'latest')
            .then(async (eventLog) => {
                let flag = await cache.getCache(THRESHOLD_FLAG);

                if(flag == 'false'){   
                    cache.setCache(THRESHOLD_FLAG, true);
                    const lastLogCount = eventLog.length - 1;
                    const lastBlockNumber = eventLog[lastLogCount].blockNumber;
                    cache.setCache(BLOCK_NUMBER, lastBlockNumber);
                    const info = {
                        change:false
                    }
                    resolve(info);
                }
                else{
                    const newEventsCount = eventLog.length - 1;
                    const lastBlockNumber = eventLog[newEventsCount].blockNumber;
                    const info = {
                        change:true,
                        log: eventLog,
                        blockChecker: fromBlock,
                        lastBlock:lastBlockNumber,
                        eventCount:newEventsCount
                      }
                    resolve(info);
                    logger.info('EventLog, eventCount, and blocks sent')
               }
            })
        })
    }

    public async getTransaction(userAddress, simulate) {
        const logger = this.logger;
        logger.debug('Getting all transactions...');

        return await new Promise((resolve, reject) => {
            this.getEverestChallengeMessage(userAddress)
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
                    .catch (err => {
                        logger.error("Unable to obtain ipfshash for wallet: %s, error: %o", userAddress, err)
                        resolve({
                            success: false,
                            err: "Unable to obtain ipfshash for wallet: " + userAddress + " | error: " + err
                        });
                    });
            })
            .catch(err => {
                logger.error("Unable to proceed with Everest transacation Function for wallet: %s, error: %o", userAddress, err);
                resolve({
                    success: false,
                    err: "Unable to proceed with Everest transacation Function for wallet: " + userAddress + " | error: " + err
                });
            });        
        })
    }

    public async getEverestChallengeMessage(userAddress) {
        const logger = this.logger;
        logger.debug('Getting payload message... ');

        return await new Promise(async(resolve, reject) => {

            const title = 'Challenge made';
            const message = `A challenge has been made on your Everest Project`;

            const payloadTitle = 'Challenge made';
            const payloadMsg = `A challenge has been made on your Everest Project`;

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
        }) 
    }

}
