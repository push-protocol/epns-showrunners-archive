// @name: Hello World Channel
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
import epnsNotify from '../helpers/epnsNotifyHelper';

@Service()
export default class HelloWorldChannel {
  constructor(
      @Inject('logger') private logger,
      @Inject('cached') private cached,
      @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
      web3network,                                                                // Network for which the interactable contract is req
      {                                                                       // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
      },
      config.helloWorldPrivateKey,                                               // Private Key of the Wallet sending Notification
      config.deployedContract,                                                // The contract address which is going to be used
      config.deployedContractABI                                              // The contract abi which is going to be useds
    );
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    const cache = this.cached;

    logger.debug('uploading payload and interacting with smart contract...');

    return await new Promise(async (resolve, reject) => {
        this.messagePayload(simulate)
        .then(async (payload) => {
          epnsNotify.uploadToIPFS(payload, logger, simulate)
            .then(async (ipfshash) => {
              logger.info("Success --> uploadToIPFS(): %o", ipfshash);

                 // Call Helper function to get interactableContracts
              const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
              
              const storageType = 1; // IPFS Storage Type
              const txConfirmWait = 0; // Wait for 0 tx confirmation

              // Send Notification
              await epnsNotify.sendNotification(
                epns.signingContract,                                           // Contract connected to signing wallet
                ethers.utils.computeAddress(config.helloWorldPrivateKey),       // Recipient to which the payload should be sent
                parseInt(payload.data.type),                                    // Notification Type
                storageType,                                                    // Notificattion Storage Type
                ipfshash,                                                       // Notification Storage Pointer
                txConfirmWait,                                                  // Should wait for transaction confirmation
                logger,                                                         // Logger instance (or console.log) to pass
                simulate                                                        // Passing true will not allow sending actual notification
              ).then ((tx) => {
                logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                logger.info("🙌 Channel Logic Completed!");
                resolve({
                  success:true,
                  data:tx
                });
              })
              .catch (err => {
                logger.error("🔥Error --> sendNotification(): %o", err);
                reject(err);
              });

            })
            .catch (err => {
              logger.error("🔥Error --> uploadToIPFS(): %o", err);
              reject(err);
            });
        })
        .catch(err => {
          logger.error(err);
          reject("🔥Error --> Unable to obtain ipfshash, error: %o", err);
        });
    });
  }

  public async messagePayload(simulate) {
    const logger = this.logger;
    logger.debug('Getting payload message... ');

    return await new Promise(async(resolve, reject) => {
      const title = 'Demo Channel';
      const message = `Hello World`;

      const payloadTitle = 'Demo Channel';
      const payloadMsg = `Hello World`;

      const payload = await epnsNotify.preparePayload(
        null,                                                               // Recipient Address | Useful for encryption
        1,                                                                  // Type of Notification
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
