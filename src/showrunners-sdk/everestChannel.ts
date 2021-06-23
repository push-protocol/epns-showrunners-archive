// @name: Everest Channel
// @version: 1.0
// @recent_changes: Changed Logic to be modular

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
// import PQueue from 'p-queue';
import { ethers, logger } from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '@epnsproject/backend-sdk'
// const queue = new PQueue();
const channelKey = channelWalletsInfo.walletsKV['everestPrivateKey_1']

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
const BLOCK_NUMBER = 'block_number';

@Service()
export default class EverestChannel {
  constructor(
    @Inject('cached') private cached,
) {
    //initializing cache
    this.cached.setCache(BLOCK_NUMBER, 0);
}
 
  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const cache = this.cached;

    logger.debug(`[${new Date(Date.now())}]-[Everest]- Checking for challenged projects addresses...`);

    // Overide logic if need be
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") && simulate.logicOverride.mode ? simulate.logicOverride.mode : false) : false;

    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    const everestNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("everestNetwork") ? simulate.logicOverride.everestNetwork : config.web3MainnetNetwork;
    // -- End Override logic

    const everest = await sdk.getContract(config.everestDeployedContract, config.everestDeployedContractABI)

    // Initialize block if that is missing
    let cachedBlock = await cache.getCache(BLOCK_NUMBER);
    if (!cachedBlock) {
      cachedBlock = 0;
      logger.debug(`[${new Date(Date.now())}]-[Everest]- Initialized flag was not set, first time initalzing, saving latest block of blockchain where everest contract is...`);
      everest.provider.getBlockNumber().then((blockNumber) => {
        logger.debug(`[${new Date(Date.now())}]-[Everest]- Current block number is... %s`, blockNumber);
        cache.setCache(BLOCK_NUMBER, blockNumber);
        logger.info("Initialized Block Number: %s", blockNumber);
      })
      .catch(err => {
        logger.debug(`[${new Date(Date.now())}]-[Everest]- Error occurred while getting Block Number: %o`, err);
      })
    }

    // Overide logic if need be
    const fromBlock = logicOverride && simulate.logicOverride.hasOwnProperty("fromBlock") ? Number(simulate.logicOverride.fromBlock) : Number(cachedBlock);
    const toBlock = logicOverride && simulate.logicOverride.hasOwnProperty("toBlock") ? Number(simulate.logicOverride.toBlock) : "latest";
    // -- End Override logic

    // Check Member Challenge Event
    this.checkMemberChallengedEvent(everestNetwork, everest, fromBlock, toBlock, simulate)
    .then(async(info: any) => {
      // First save the block number
      cache.setCache(BLOCK_NUMBER, info.lastBlock);

      // Check if there are events else return
      if (info.eventCount == 0) {
        logger.info("No New Challenges Made...");
      }
      // Otherwise process those challenges
      for(let i = 0; i < info.eventCount; i++) {
        let user = info.log[i].args.member
        const title = 'Challenge made';
        const message = `A challenge has been made on your Everest Project`;
        const payloadTitle = 'Challenge made';
        const payloadMsg = `A challenge has been made on your Everest Project`;
        const notificationType = 3;
        const tx = await sdk.sendNotification(user, title, message, payloadTitle, payloadMsg, notificationType, simulate)
        logger.info(tx);
      }
    })
    .catch(err => {
      logger.debug(`[${new Date(Date.now())}]-[Everest]- 🔥Error --> Unable to obtain challenged members event: %o`, err);
    });
  }

  public async checkMemberChallengedEvent(web3network, everest, fromBlock, toBlock, simulate) {
    logger.debug(`[${new Date(Date.now())}]-[Everest]- Getting eventLog, eventCount, blocks...`);

    // Check if everest is initialized, if not initialize it
    if (!everest) {
      // check and recreate provider mostly for routes
      logger.info(`[${new Date(Date.now())}]-[Everest]- Mostly coming from routes... rebuilding interactable erc20s`);
      everest = await sdk.getContract(config.everestDeployedContract, config.everestDeployedContractABI)
      logger.info(`[${new Date(Date.now())}]-[Everest]- Rebuilt everest --> %o`, everest);
    }
    if (!toBlock) {
      logger.info(`[${new Date(Date.now())}]-[Everest]- Mostly coming from routes... resetting toBlock to latest`);
      toBlock = "latest";
    }
    const cache = this.cached;
    return await new Promise(async(resolve, reject) => {
      const filter = everest.contract.filters.MemberChallenged();
      logger.debug(`[${new Date(Date.now())}]-[Everest]- Looking for MemberChallenged() from %d to %s`, fromBlock, toBlock);

      everest.contract.queryFilter(filter, fromBlock, toBlock)
        .then(async (eventLog) => {
          logger.debug(`[${new Date(Date.now())}]-[Everest]- MemberChallenged() --> %o`, eventLog);

          // Need to fetch latest block
          try {
            toBlock = await everest.provider.getBlockNumber();
            logger.debug(`[${new Date(Date.now())}]-[Everest]- Latest block updated to --> %s`, toBlock);
          }
          catch (err) {
            logger.debug(`[${new Date(Date.now())}]-[Everest]- !Errored out while fetching Block Number --> %o`, err);
          }
          const info = {
            change: true,
            log: eventLog,
            blockChecker: fromBlock,
            lastBlock: toBlock,
            eventCount: eventLog.length
          }
          resolve(info);

          logger.debug(`[${new Date(Date.now())}]-[Everest]- Events retreived for MemberChallenged() call of Everest Contract --> %d Events`, eventLog.length);
        })
        .catch (err => {
          logger.debug(`[${new Date(Date.now())}]-[Everest]- Unable to obtain query filter, error: %o`, err)
          resolve({
            success: false,
            err: "Unable to obtain query filter, error: %o" + err
          });
        });
    })
  }
}

