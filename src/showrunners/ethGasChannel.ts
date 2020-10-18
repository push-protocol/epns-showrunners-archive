import { Service, Inject, Container } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { truncateSync } from 'fs';
import Cache from '../services/cache';
import GasPrice from '../services/gasPrice';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

// variables for mongoDb and redis
const cache = Container.get(Cache);
const gasPrice = Container.get(GasPrice);
const GAS_PRICE = 'gasprice';
const THRESHOLD_FLAG = 'threshold_flag';
const GAS_PRICE_FOR_THE_DAY = 'gas_price_for_the_day';

//initializing redis
cache.setCache(THRESHOLD_FLAG, true);
cache.setCache(GAS_PRICE_FOR_THE_DAY, 0);

@Service()
export default class GasStationChannel {
  constructor(@Inject('logger') private logger, @EventDispatcher() private eventDispatcher: EventDispatcherInterface) {}

  //To form and write to smart contract
  public async sendMessageToContract() {
    const logger = this.logger;
    logger.debug('Getting gas price, forming and uploading payload and interacting with smart contract...');

    return await new Promise((resolve, reject) => {
      this.getGasPrice()
      .then(message =>{
        if(message == 'flag has not changed'){
          resolve({
            success: "flag has not changed "
          });          
          logger.info('flag has not changed')
        }
        else{
        this.getNewPrice(message)
        .then(payload => {
          const jsonisedPayload = JSON.stringify(payload);

          // handle payloads, etc
          const ipfs = require('nano-ipfs-store').at('https://ipfs.infura.io:5001');
          ipfs
            .add(jsonisedPayload)
            .then(ipfshash => {
              // Sign the transaction and send it to chain
              const walletAddress = ethers.utils.computeAddress(config.ethGasStationPrivateKey);

              logger.info(
                'Payload prepared: %o, ipfs hash generated: %o, sending data to on chain from address %s...',
                payload,
                ipfshash,
                walletAddress,
              );

              let provider = new ethers.providers.InfuraProvider('ropsten');
              let wallet = new ethers.Wallet(config.ethGasStationPrivateKey, provider);

              // define contract
              let contract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
              // logger.info("Contract defined at address: %s with object: %o", ethers.utils.computeAddress(config.btcTickerPrivateKey), contract);

              // connect as a signer of the non-constant methode
              let contractWithSigner = contract.connect(wallet);

              let txPromise = contractWithSigner.sendMessage(
                ethers.utils.computeAddress(config.ethGasStationPrivateKey),
                parseInt(payload.data.type),
                ipfshash,
                1,
              );

              txPromise
                .then(function(tx) {
                  logger.info('Transaction sent: %o', tx);
                  return resolve({ success: 1, data: tx });
                })
                .catch(err => {
                  reject('Unable to complete transaction, error: %o', err);
                  throw err;
                });
            })
            .catch(err => {
              reject('Unable to obtain ipfshash, error: %o', err);
              throw err;
            });
        })
        .catch(err => {
          logger.error(err);
          reject('Unable to proceed with payload, error: %o', err);
          throw err;
        });
      }
      })
      
    });
  }

  
  public async getGasPrice() {
    const logger = this.logger;
    logger.debug('Getting gas price from ETH Gas Station');

    return await new Promise((resolve, reject) => {
      const getJSON = bent('json');
      const gasroute = 'api/ethgasAPI.json';
      const pollURL = `${config.gasEndpoint}${gasroute}?api-key=${config.gasAPIKey}`;

      getJSON(pollURL).then(async result => {
        let averageGas10Mins = result.fast / 10;
        logger.info("average: %o", averageGas10Mins);

        //adding average gas every 10mins for 24 hrs to get the todaysAverageGasPrice
        cache.addCache(GAS_PRICE_FOR_THE_DAY, averageGas10Mins);
        const getPricee = await cache.getCache(GAS_PRICE_FOR_THE_DAY);
        logger.info('cache gotten from redis: %o', getPricee);
        
        // assigning the average gas price for 90 days to variable 
        let movingAverageGasForTheLast90DaysFromMongoDB = await gasPrice.getAverageGasPrice(90);
        logger.info('moving average gas: %o', movingAverageGasForTheLast90DaysFromMongoDB.average);

        // assigning the threshold to a variable
        let flag = await cache.getCache(THRESHOLD_FLAG);


        // checks if the result gotten every 10 minutes is higher than the movingAverageGasForTheLast90DaysFromMongoDB 
        if (movingAverageGasForTheLast90DaysFromMongoDB.average < averageGas10Mins && flag == 'true') {
          let message = 'has increased';
          resolve(message);
          cache.setCache(THRESHOLD_FLAG, false);
        } 

        // checks if the result gotten every 10 minutes is less than the movingAverageGasForTheLast90DaysFromMongoDB 
        else if (movingAverageGasForTheLast90DaysFromMongoDB.average > averageGas10Mins && flag == 'false') {
          let message = 'has reduced';
          resolve(message);
          cache.setCache(THRESHOLD_FLAG, true);
        }
        else{
          let message = 'flag has not changed';
          resolve(message);
        }
        const afterIfStatement = await cache.getCache(THRESHOLD_FLAG)
        logger.info('flag: %o', afterIfStatement)
      });
    });
  }

  public async getNewPrice(messages) {
    const logger = this.logger;

    return await new Promise((resolve, reject) => {
      const title = 'Gas Price';
      const message = `Gas Price ${messages} `;

      const payloadTitle = `Gas Price Movement`;
      const payloadMsg = `Dear subscriber gas price ${messages} `;

      const payload = {
        notification: {
          title: title,
          body: message,
        },
        data: {
          type: '1', // Group Message
          secret: '',
          asub: payloadTitle,
          amsg: payloadMsg,
          acta: '',
          aimg: '',
        },
      };

      resolve(payload);
    });
  }

  public async updateMongoDb() {
    const logger = this.logger;
    logger.debug('updating mongodb');

    const gasPricee = await cache.getCache(GAS_PRICE_FOR_THE_DAY)
    logger.info('todays average gas price before revert: %o', gasPricee)

    const todaysAverageGasPrice = (gasPricee) / 144;
    logger.info('todays average gas price: %o', todaysAverageGasPrice);

    await cache.setCache(GAS_PRICE_FOR_THE_DAY, 0);
    const gasPriceAfterRever = await cache.getCache(GAS_PRICE_FOR_THE_DAY)
    logger.info('todays average gas price after revert: %o', gasPriceAfterRever);

    let movingAverageForYesterdayFromMongoDB = await gasPrice.getAverageGasPrice(90);
    logger.info('last 90 days moving average: %o',movingAverageForYesterdayFromMongoDB.average);

    const todaysMovingAverage =
      ((movingAverageForYesterdayFromMongoDB.average * 90) + (todaysAverageGasPrice * 1)) / (90 + 1);
      logger.info('todays moving average: %o', todaysMovingAverage)

    gasPrice.setGasPrice(todaysMovingAverage);
  }
}