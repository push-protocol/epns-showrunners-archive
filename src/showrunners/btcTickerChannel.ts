import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const epnsNotify = require('../helpers/epnsNotifyHelper');

@Service()
export default class BtcTickerChannel {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  // To form and write to smart contract
  public async sendMessageToContract() {
    const logger = this.logger;
    logger.debug('Getting btc price, forming and uploading payload and interacting with smart contract...');

    return await new Promise((resolve, reject) => {
      this.getNewPrice()
        .then(async (payload) => {
          epnsNotify.uploadToIPFS(payload, logger)
            .then(async (ipfshash) => {
              logger.info("Success --> uploadToIPFS(): %o", ipfshash);

              // Call Helper function to get interactableContracts
              const epns = epnsNotify.getInteractableContracts(
                config.web3RopstenNetwork,                                      // Network for which the interactable contract is req
                {                                                               // API Keys
                  etherscanAPI: config.etherscanAPI,
                  infuraAPI: config.infuraAPI,
                  alchemyAPI: config.alchemyAPI
                },
                config.btcTickerPrivateKey,                                     // Private Key of the Wallet sending Notification
                config.deployedContract,                                        // The contract address which is going to be used
                config.deployedContractABI                                      // The contract abi which is going to be useds
              );

              const storageType = 1; // IPFS Storage Type
              const txConfirmWait = 0; // Wait for 0 tx confirmation

              // Send Notification
              await epnsNotify.sendNotification(
                epns.signingContract,                                           // Contract connected to signing wallet
                ethers.utils.computeAddress(config.btcTickerPrivateKey),        // Recipient to which the payload should be sent
                parseInt(payload.data.type),                                    // Notification Type
                storageType,                                                    // Notificattion Storage Type
                ipfshash,                                                       // Notification Storage Pointer
                txConfirmWait,                                                  // Should wait for transaction confirmation
                logger                                                          // Logger instance (or console.log) to pass
              ).then ((tx) => {
                logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                logger.info("🙌 BTC Ticker Channel Logic Completed!");
                resolve(tx);
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

  public async getNewPrice() {
    const logger = this.logger;
    logger.debug('Getting price of btc... ');

    return await new Promise((resolve, reject) => {
      const getJSON = bent('json');

      const cmcroute = 'v1/cryptocurrency/quotes/latest';
      const pollURL = `${config.cmcEndpoint}${cmcroute}?symbol=BTC&CMC_PRO_API_KEY=${config.cmcAPIKey}`;

      getJSON(pollURL)
        .then(async (response) => {
          if (response.status.error_code) {
            reject("CMC Error: %o", response.status);
          }

          logger.info("CMC Response: %o", response);

          // Get data
          const data = response.data["BTC"];

          // construct Title and Message from data
          const price = data.quote.USD.price;
          const formattedPrice = Number(Number(price).toFixed(2)).toLocaleString();

          const hourChange = Number(data.quote.USD.percent_change_1h).toFixed(2);
          const dayChange = Number(data.quote.USD.percent_change_24h).toFixed(2);
          const weekChange = Number(data.quote.USD.percent_change_7d).toFixed(2);

          const title = "BTC at $" + formattedPrice;
          const message = `\nHourly Movement: ${hourChange}%\nDaily Movement: ${dayChange}%\nWeekly Movement: ${weekChange}%`;

          const payloadTitle = `BTC Price Movement`;
          const payloadMsg = `BTC at [d:$${formattedPrice}]\n\nHourly Movement: ${hourChange >= 0 ? "[s:" + hourChange + "%]" : "[t:" + hourChange + "%]"}\nDaily Movement: ${dayChange >= 0 ? "[s:" + dayChange + "%]" : "[t:" + dayChange + "%]"}\nWeekly Movement: ${weekChange >= 0 ? "[s:" + weekChange + "%]" : "[t:" + weekChange + "%]"}[timestamp: ${Math.floor(new Date() / 1000)}]`;

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

          resolve(payload);
        })
        .catch(err => reject("Unable to reach CMC API, error: %o", err));
    });
  }
}
