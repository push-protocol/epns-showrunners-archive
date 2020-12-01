// @name: Everest Channel
// @version: 1.0
// @recent_changes: Changed Logic to be modular

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

// SET CONSTANTS
const BLOCK_NUMBER = 'block_number';

@Service()
export default class EverestChannel {
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
      config.everestPrivateKey,                                               // Private Key of the Wallet sending Notification
      config.deployedContract,                                                // The contract address which is going to be used
      config.deployedContractABI                                              // The contract abi which is going to be useds
    );
  }

  public getEverestInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
      web3network,                                                                // Network for which the interactable contract is req
      {                                                                       // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
      },
      null,                                                                     // Private Key of the Wallet sending Notification
      config.everestDeployedContract,                                          // The contract address which is going to be used
      config.everestDeployedContractABI                                        // The contract abi which is going to be useds
    );
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    const cache = this.cached;

    logger.debug('Checking for challenged projects addresses...');

    return await new Promise(async (resolve, reject) => {
      let allTransactions = [];

      // Overide logic if need be
      const logicOverride = simulate.hasOwnProperty("logicOverride");

      const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
      const everestNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("everestNetwork") ? simulate.logicOverride.everestNetwork : config.web3MainnetNetwork;
      // -- End Override logic

      // Call Helper function to get interactableContracts
      const epns = this.getEPNSInteractableContract(epnsNetwork);
      const everest = this.getEverestInteractableContract(everestNetwork);

      // Initialize block if that is missing
      let cachedBlock = await cache.getCache(BLOCK_NUMBER);
      if (!cachedBlock) {
        cachedBlock = 0;

        logger.debug("Initialized flag was not set, first time initalzing, saving latest block of blockchain where everest contract is...");

        everest.provider().getBlockNumber().then((blockNumber) => {
          logger.debug("Current block number is... %s", blockNumber);
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
      const fromBlock = logicOverride && simulate.logicOverride.hasOwnProperty("fromBlock") ? Number(simulate.logicOverride.fromBlock) : Number(cachedBlock);
      const toBlock = logicOverride && simulate.logicOverride.hasOwnProperty("toBlock") ? Number(simulate.logicOverride.toBlock) : "latest";
      // -- End Override logic

      // Check Member Challenge Event
      this.checkMemberChallengedEvent(everestNetwork, everest, fromBlock, toBlock, simulate).then((info) => {
        // First save the block number
        cache.setCache(BLOCK_NUMBER, info.lastBlock);

        // Check if there are events else return
        if (info.eventCount == 0) {
          resolve("No New Challenges Made...");
          return;
        }

        // Otherwise process those challenges
        for(let i = 1; i < info.eventCount; i++) {
          let userAddress = info.log[i].args.member

          allTransactions.push(
            this.getTransaction(userAddress, simulate).then(results => {
              return results;
            })
          );
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
                logger,                                                         // Logger instance (or console.log) to pass
                simulate                                                        // Passing true will not allow sending actual notification
              ).then ((tx) => {
                logger.info("Transaction mined: %o | Notification Sent", tx.hash);
              })
              .catch (err => {
                logger.error("🔥Error on wallet: %s [SKIPPING] --> sendNotification(): %o", wallet, err);
              });
            }
          }

          logger.info("🙌 Everest Ticker Channel Logic Completed!");
          resolve("🙌 Everest Ticker Channel Logic Completed!");
        })
      })
      .catch(err => {
        logger.error(err);
        reject("🔥Error --> Unable to obtain challenged members event: %o", err);
      });
    })
  }

  public async checkMemberChallengedEvent(web3network, everest, fromBlock, toBlock, simulate) {
    const logger = this.logger;
    logger.debug('Getting eventLog, eventCount, blocks...');

    // Check if everest is initialized, if not initialize it
    if (!everest) {
      // check and recreate provider mostly for routes
      logger.info("Mostly coming from routes... rebuilding interactable erc20s");
      everest = this.getEverestInteractableContract(web3network);
      logger.info("Rebuilt everest --> %o", everest);
    }

    if (!toBlock) {
      logger.info("Mostly coming from routes... resetting toBlock to latest");
      toBlock = "latest";
    }

    const cache = this.cached;

    return await new Promise(async(resolve, reject) => {
      const filter = everest.contract.filters.MemberChallenged();
      logger.debug("Looking for MemberChallenged() from %d to %s", fromBlock, toBlock);

      everest.contract.queryFilter(filter, fromBlock, toBlock)
        .then(async (eventLog) => {
          logger.debug("MemberChallenged() --> %o", eventLog);

          // Need to fetch latest block
          try {
            toBlock = await everest.provider.getBlockNumber();
            logger.debug("Latest block updated to --> %s", toBlock);
          }
          catch (err) {
            logger.error("!Errored out while fetching Block Number --> %o", err);
          }

          const info = {
            change: true,
            log: eventLog,
            blockChecker: fromBlock,
            lastBlock: toBlock,
            eventCount: eventLog.length
          }
          resolve(info);

          logger.debug('Events retreived for MemberChallenged() call of Everest Contract --> %d Events', eventLog.length);
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

  public async getTransaction(userAddress, simulate) {
    const logger = this.logger;
    logger.debug('Getting all transactions...');

    return await new Promise((resolve, reject) => {
      this.prepareEverestChallengePayload(userAddress, simulate)
        .then(async payload => {

          epnsNotify.uploadToIPFS(payload, logger, simulate).then(async (ipfshash) => {
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

  public async prepareEverestChallengePayload(userAddress, simulate) {
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
