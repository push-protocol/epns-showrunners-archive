// @name: UniSwap Channel
// @version: 1.0
// @recent_changes: Changed Logic to be modular

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { ethers, logger} from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '@epnsproject/backend-sdk'
const channelKey = channelWalletsInfo.walletsKV['uniSwapPrivateKey_1']

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
const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
const sdk = new epnsHelper(NETWORK_TO_MONITOR, channelKey, settings, epnsSettings)


// SET CONSTANTS
const BLOCK_NUMBER = 'block_number';


@Service()
export default class uniSwapChannel {
    constructor(
        @Inject('cached') private cached,
    ) {
        //initializing cache
        this.cached.setCache(BLOCK_NUMBER, 0);
    }

    // To form and write to smart contract
    public async sendMessageToContract(simulate) {
        const cache = this.cached;

        return await new Promise(async (resolve, reject) => {
            // Overide logic if need be
            const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
            const epnsNetwork = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
            const uniswapNetwork = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("uniswapNetwork") ? simulate.logicOverride.uniswapNetwork : NETWORK_TO_MONITOR;
            // -- End Override logic

            // Call Helper function to get interactableContracts
            const uniSwap = await sdk.getContract(config.uniswapDeployedContractMainnet, config.uniswapDeployedContractABI)

            // Initialize block if that is missing
            let cachedBlock = await cache.getCache(BLOCK_NUMBER);
            if (cachedBlock == 0) {
                cachedBlock = 0;
                logger.debug("Initialized flag was not set, first time initalzing, saving latest block of blockchain where uniSwap contract is...");
                uniSwap.provider.getBlockNumber()
                .then((blockNumber: number) => {
                    logger.debug("Current block number is %s", blockNumber);
                    cache.setCache(BLOCK_NUMBER, blockNumber);
                    resolve(`Initialized Block Number: ${blockNumber}`, );
                })
                .catch(err => {
                    logger.error("Error occurred while getting Block Number: %o", err);
                    reject(err);
                })
            }
            // Overide logic if need be
            const fromBlock = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("fromBlock") ? Number(simulate.logicOverride.fromBlock) : Number(cachedBlock);
            const toBlock = logicOverride && simulate.logicOverride.mode && simulate.logicOverride.hasOwnProperty("toBlock") ? Number(simulate.logicOverride.toBlock) : "latest";
            // -- End Override logic

            // Check Member Challenge Event
            this.checkForNewProposal( uniswapNetwork, uniSwap, fromBlock, toBlock, simulate )
            .then(async(info: any) => {
                // First save the block number
                cache.setCache(BLOCK_NUMBER, info.lastBlock);

                // Check if there are events else return
                if (info.eventCount == 0) {
                    logger.info("No New Proposal has been proposed...");
                    resolve("No New Proposal has been proposed...");
                }
                else{
                    await this.getProposalPayload(info.log, simulate)
                }
            })
        });
    }

    public async checkForNewProposal( uniswapNetwork, uniSwap, fromBlock, toBlock, simulate ) {
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
            uniSwap = await sdk.getContract(config.uniswapDeployedContractMainnet, config.uniswapDeployedContractABI);
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
            const channelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['uniSwapPrivateKey_1'])
            const notificationType = 1; //broadcasted notification
            const tx = await sdk.sendNotification(channelAddress, title, message.join('\n'), payloadTitle, payloadMsg.join('\n'), notificationType, simulate)
            logger.info(tx);
            return{
            success: true,
            data: tx
            }
    }
}
