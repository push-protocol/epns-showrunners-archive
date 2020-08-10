import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');

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
        .then(payload => {
          const jsonisedPayload = JSON.stringify(payload);

          // handle payloads, etc
          const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
          ipfs.add(jsonisedPayload)
            .then(ipfshash => {
              // Sign the transaction and send it to chain
              const walletAddress = ethers.utils.computeAddress(config.btcTickerPrivateKey);

              logger.info("Payload prepared: %o, ipfs hash generated: %o, sending data to on chain from address %s...", payload, ipfshash, walletAddress);

              let provider = new ethers.providers.InfuraProvider('ropsten');
              let wallet = new ethers.Wallet(config.btcTickerPrivateKey, provider);

              // define contract
              let contract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
              // logger.info("Contract defined at address: %s with object: %o", ethers.utils.computeAddress(config.btcTickerPrivateKey), contract);

              // connect as a signer of the non-constant methode
              let contractWithSigner = contract.connect(wallet);
              let txPromise = contractWithSigner.sendMessage(ethers.utils.computeAddress(config.btcTickerPrivateKey), parseInt(payload.data.type), ipfshash, 1);

              txPromise
                .then(function(tx) {
                  logger.info("Transaction sent: %o", tx);
                  return resolve({ success: 1, data: tx });
                })
                .catch(err => {
                  reject("Unable to complete transaction, error: %o", err)
                  throw err;
                });
            })
            .catch(err => {
              reject("Unable to obtain ipfshash, error: %o", err)
              throw err;
            });
        })
        .catch(err => {
          logger.error(err);
          reject("Unable to proceed with cmc, error: %o", err);
          throw err;
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
        .then(response => {
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
          const payloadMsg = `BTC at [d:$${formattedPrice}]\n\nHourly Movement: ${hourChange >= 0 ? "[s:" + hourChange + "%]" : "[t:" + hourChange + "%]"}\nDaily Movement: ${dayChange >= 0 ? "[s:" + dayChange + "%]" : "[t:" + dayChange + "%]"}\nWeekly Movement: ${weekChange >= 0 ? "[s:" + weekChange + "%]" : "[t:" + weekChange + "%]"}\n\n[b:Updated:]  [i:${moment(data.quote.USD.last_updated).format('MMMM Do YYYY, h:mm:ss a')} (GMT)]`;

          const payload = {
            "notification": {
              "title": title,
              "body": message
            },
            "data": {
              "type": "1", // Group Message
              "secret": "",
              "asub": payloadTitle,
              "amsg": payloadMsg,
              "acta": "",
              "aimg": ""
            }
          };

          resolve(payload);
        })
        .catch(err => reject("Unable to reach CMC API, error: %o", err));
    });
  }
}
