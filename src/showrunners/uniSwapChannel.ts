// @name: UniSwap Channel
// @version: 1.0
// @recent_changes: Changed Logic to be modular

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import epnsNotify from '../helpers/epnsNotifyHelper';

// SET CONSTANTS
const BLOCK_NUMBER = 'block_number';
const NETWORK_TO_MONITOR = config.web3RopstenNetwork;

@Service()
export default class uniSwapChannel {
    constructor(
        @Inject('logger') private logger,
        @Inject('cached') private cached,
        @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
    ) {
        //initializing cache
        this.cached.setCache(BLOCK_NUMBER, 0);
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
            channelWalletsInfo.walletsKV['uniSwapPrivateKey_1'],                   // Private Key of the Wallet sending Notification
            config.deployedContract,                                                // The contract address which is going to be used
            config.deployedContractABI                                              // The contract abi which is going to be useds
        );
    }

    public getUniSwapInteractableContract(web3network) {
        let uniswapDeployedContract
        if(web3network == config.web3RopstenNetwork){
        uniswapDeployedContract = config.uniswapDeployedContractRopsten
        }
        else if(web3network == config.web3MainnetNetwork){
        uniswapDeployedContract = config.uniswapDeployedContractMainnet
    }
        // Get Contract
        return epnsNotify.getInteractableContracts(
            web3network,                                                                // Network for which the interactable contract is req
            {                                                                       // API Keys
                etherscanAPI: config.etherscanAPI,
                infuraAPI: config.infuraAPI,
                alchemyAPI: config.alchemyAPI
            },
            null,                                                                     // Private Key of the Wallet sending Notification
            uniswapDeployedContract,                                          // The contract address which is going to be used
            config.uniswapDeployedContractABI                                        // The contract abi which is going to be useds
        );
    }

    // To form and write to smart contract
    public async sendMessageToContract(simulate) {
        const logger = this.logger;
        const cache = this.cached;
        //logger.debug('Getting btc price, forming and uploading payload and interacting with smart contract...');

        return await new Promise(async (resolve, reject) => {

            // Overide logic if need be
            const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
            const epnsNetwork = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
            const uniswapNetwork = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("uniswapNetwork") ? simulate.logicOverride.uniswapNetwork : NETWORK_TO_MONITOR;
            // -- End Override logic

            // Call Helper function to get interactableContracts
            const epns = this.getEPNSInteractableContract(epnsNetwork);
            const uniSwap = this.getUniSwapInteractableContract(uniswapNetwork);

            // Initialize block if that is missing
            let cachedBlock = await cache.getCache(BLOCK_NUMBER);
            if (cachedBlock == 0) {
                cachedBlock = 0;

                logger.debug("Initialized flag was not set, first time initalzing, saving latest block of blockchain where uniSwap contract is...");

                uniSwap.provider.getBlockNumber()
                .then((blockNumber) => {
                    logger.debug("Current block number is %s", blockNumber);
                    cache.setCache(BLOCK_NUMBER, blockNumber);

                    resolve("Initialized Block Number: %s", blockNumber);
                })
                .catch(err => {
                    logger.error("Error occurred while getting Block Number: %o", err);
                    reject(err);
                })

                return;
            }

            // Overide logic if need be
            const fromBlock = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("fromBlock") ? Number(simulate.logicOverride.fromBlock) : Number(cachedBlock);
            const toBlock = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("toBlock") ? Number(simulate.logicOverride.toBlock) : "latest";
            // -- End Override logic

            // Check Member Challenge Event
            this.checkForNewProposal( uniswapNetwork, uniSwap, fromBlock, toBlock, simulate ).then((info) => {
                // First save the block number
                cache.setCache(BLOCK_NUMBER, info.lastBlock);

                // Check if there are events else return
                if (info.eventCount == 0) {
                    logger.info("No New Proposal has been proposed...");
                    resolve("No New Proposal has been proposed...");
                    return;
                }
                else{
                    this.getProposalPayload(info.log, simulate)
                    .then(async (payload) => {
                        epnsNotify.uploadToIPFS(payload, logger, simulate)
                        .then(async (ipfshash) => {
                            logger.info("Success --> uploadToIPFS(): %o", ipfshash);

                            const storageType = 1; // IPFS Storage Type
                            const txConfirmWait = 0; // Wait for 0 tx confirmation

                            // Send Notification
                            await epnsNotify.sendNotification(
                                epns.signingContract,                                           // Contract connected to signing wallet
                                ethers.utils.computeAddress(channelWalletsInfo.walletsKV['uniSwapPrivateKey_1']),        // Recipient to which the payload should be sent
                                parseInt(payload.data.type),                                    // Notification Type
                                storageType,                                                    // Notificattion Storage Type
                                ipfshash,                                                       // Notification Storage Pointer
                                txConfirmWait,                                                  // Should wait for transaction confirmation
                                logger,                                                         // Logger instance (or console.log) to pass
                                simulate                                                        // Passing true will not allow sending actual notification
                            ).then ((tx) => {
                                logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                                logger.info("🙌 UNISWAP Channel Logic Completed!");
                                resolve(tx);
                            })
                            .catch (err => {
                                logger.error("🔥Error --> sendNotification(): %o", err);
                                reject(err);
                            });
                        })
                        .catch (err => {
                            logger.error("🔥Error --> Unable to obtain ipfshash, error: %o", err);
                            reject(err);
                        });
                    })
                    .catch(err => {
                        logger.error(err);
                        reject("🔥Error --> Unable to obtain payload, error: %o", err);
                    });
                }
            })
        });
    }

    public async checkForNewProposal( uniswapNetwork, uniSwap, fromBlock, toBlock, simulate ) {
        const logger = this.logger;
        const cache = this.cached;
        logger.debug('Getting recent proposal... ');

        // Overide logic if need be
        const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
        const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
        const simulateUniswapNetwork = logicOverride && mode && simulate.logicOverride.hasOwnProperty("uniswapNetwork") ? simulate.logicOverride.uniswapNetwork : false;
        const simulateFromBlock = logicOverride && mode && simulate.logicOverride.hasOwnProperty("fromBlock") ? simulate.logicOverride.fromBlock : false;
        const simulateToBlock = logicOverride && mode && simulate.logicOverride.hasOwnProperty("toBlock") ? simulate.logicOverride.toBlock : false;
        if(!uniswapNetwork && simulateUniswapNetwork){
            uniswapNetwork = simulateUniswapNetwork
        }
        if (!fromBlock && simulateFromBlock) {
            logger.info("Simulated fromBlock : %o", simulateFromBlock);
            fromBlock = simulateFromBlock;
        }
        if (!toBlock && simulateToBlock) {
            logger.info("Simulated toBlock: %o", simulateToBlock);
            toBlock = simulateToBlock;
        }
        // -- End Override logic

        // Check if uniswap is initialized, if not initialize it
        if (!uniSwap) {
            // check and recreate provider mostly for routes
            logger.info("Mostly coming from routes...");
            uniSwap = this.getUniSwapInteractableContract(uniswapNetwork);
        }
    
        

        return await new Promise((resolve, reject) => {
            const filter = uniSwap.contract.filters.ProposalCreated();
            logger.debug("Looking for ProposalCreated() from %d to %s", fromBlock, toBlock);

            uniSwap.contract.queryFilter(filter, fromBlock, toBlock)
            .then(async (eventLog) => {

                // Need to fetch latest block
                try {
                    toBlock = await uniSwap.provider.getBlockNumber();
                    logger.debug("Latest block updated to --> %s", toBlock);
                }
                catch (err) {
                    logger.error("!Errored out while fetching Block Number --> %o", err);
                }

                const info = {
                    change: true,
                    log: eventLog,
                    lastBlock: toBlock,
                    eventCount: eventLog.length
                }
                resolve(info);

                logger.debug('Events retreived for ProposalCreated() call of uniSwap Governance Contract --> %d Events', eventLog.length);
            })
            .catch (err => {
                logger.error("Unable to obtain query filter, error: %o", err)
                resolve({
                    success: false,
                    err: "Unable to obtain query filter, error: %o" + err
                });
            });
        })
    }

    public async getProposalPayload(eventLog, simulate) {
        const logger = this.logger;
        logger.debug('Getting payload... ');

        return await new Promise(async (resolve, reject) => {

            let message = [];
            let payloadMsg = [];

            // Overide logic if need be
            const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
            const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
            const simulateMessage = logicOverride && mode && simulate.logicOverride.hasOwnProperty("message") ? simulate.logicOverride.message : false;
            const simulatePayloadMessage = logicOverride && mode && simulate.logicOverride.hasOwnProperty("payloadMessage") ? simulate.logicOverride.payloadMessage : false;
            
            if(!eventLog && simulateMessage && simulatePayloadMessage){
                message.push(simulateMessage);
                payloadMsg.push(simulatePayloadMessage);
            }
            // -- End Override logic

            if(eventLog){
                if(eventLog.length > 1){
                
                    for(let i = 0; i < eventLog.length; i++) {
                        let msg = "A proposal has been made with description :" + eventLog[i].args.description 
                        let pMsg = "Dear user a proposal has been made with description :" + eventLog[i].args.description
                        message.push(msg);
                        payloadMsg.push(pMsg);
                    }
                }
                else{
                    let msg = "A proposal has been made with description :" + eventLog[0].args.description 
                    let pMsg = "Dear user a proposal has been made with description :" + eventLog[0].args.description
                    message.push(msg);
                    payloadMsg.push(pMsg);
                }

            }
            payloadMsg.push(`[timestamp: ${Math.floor(new Date() / 1000)}]`);
        
            const title = 'A new proposal is available';

            const payloadTitle = `A new proposal is available`;
                
            const payload = await epnsNotify.preparePayload(
                null,                                                               // Recipient Address | Useful for encryption
                1,                                                                  // Type of Notification
                title,                                                              // Title of Notification
                message.join('\n'),                                                            // Message of Notification
                payloadTitle,                                                       // Internal Title
                payloadMsg.join('\n'),                                                         // Internal Message
                'https://app.uniswap.org/#/vote',                                                               // Internal Call to Action Link
                null,                                                               // internal img of youtube link
            );
            
            logger.debug('Payload Prepared: %o', payload);

            resolve(payload);
        })
    }
}
