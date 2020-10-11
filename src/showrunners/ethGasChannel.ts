import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { truncateSync } from 'fs';
import cache from '../services/cache'

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const GAS_PRICE = 'gasprice';
const THRESHOLD_FLAG = 'threshold_flag';


@Service()
export default class GasStationChannel {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public async getGasPrice() {
    const logger = this.logger;
    logger.debug('Getting gas price from ETH Gas Station');

    return await new Promise((resolve, reject) => {
      const getJSON = bent('json');
      const gasroute = 'api/ethgasAPI.json'
      const pollURL = `${config.gasEndpoint}${gasroute}?api-key=${config.gasAPIKey}`;

      getJSON(pollURL)
        .then(async (result) => {
         let averageGas = result.fast/10;
         cache.setCache(GAS_PRICE,10)
         console.log("cache gotten from redis",await cache.getCache(GAS_PRICE))
        //cache interaction
        //  let movingAverageForYesterdayFromMongoDB = 90;
        //  let flag = await cache.getCache(THRESHOLD_FLAG);
        //  let flag1 = await cache.getCache(THRESHOLD_FLAG);
         
        //   if(movingAverageForYesterdayFromMongoDB < averageGas && flag == false){
        //     let message = 'has increased'
        //     this.sendMessageToContract(message)
        //     flag = true; 
        //     flag1 = false; 
        //     cache.setCache(THRESHOLD_FLAG,true)   

        //   }
        //   else if(movingAverageForYesterdayFromMongoDB > averageGas && flag1 == false){
        //     let message = 'has reduced'
        //     this.sendMessageToContract(message)
        //     flag1 = true;
        //     flag = false;
        //   }
        })
      })
  }

  //To form and write to smart contract
  public async sendMessageToContract(message) {
    const logger = this.logger;
    logger.debug('Getting gas price, forming and uploading payload and interacting with smart contract...');

    return await new Promise((resolve, reject) => {
      this.getNewPrice(message)
      .then(payload => {
        const jsonisedPayload = JSON.stringify(payload);

        // handle payloads, etc
        const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
        ipfs.add(jsonisedPayload)
          .then(ipfshash => {
            // Sign the transaction and send it to chain
            const walletAddress = ethers.utils.computeAddress(config.ethGasStationPrivateKey);

            logger.info("Payload prepared: %o, ipfs hash generated: %o, sending data to on chain from address %s...", payload, ipfshash, walletAddress);

            let provider = new ethers.providers.InfuraProvider('ropsten');
            let wallet = new ethers.Wallet(config.ethGasStationPrivateKey, provider);

            // define contract
            let contract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
            // logger.info("Contract defined at address: %s with object: %o", ethers.utils.computeAddress(config.btcTickerPrivateKey), contract);

            // connect as a signer of the non-constant methode
            let contractWithSigner = contract.connect(wallet);
            let txPromise = contractWithSigner.sendMessage(ethers.utils.computeAddress(config.ethGasStationPrivateKey), parseInt(payload.data.type), ipfshash, 1);

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


  public async getNewPrice(messages) {
    const logger = this.logger;
    logger.debug('Getting price of btc... ');

    return await new Promise((resolve, reject) => {
      const title = "Gas Price" ;
      const message = `Gas Price ${messages} `;

      const payloadTitle = `Gas Price Movement`;
      const payloadMsg = `Dear subscriber gas price ${messages} `;

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
    });
  }
}
