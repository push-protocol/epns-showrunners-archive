import { Service, Inject, Container } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { truncateSync } from 'fs';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

// variables for mongoDb and redis
const GAS_PRICE = 'gasprice';
const THRESHOLD_FLAG = 'threshold_flag';
const GAS_PRICE_FOR_THE_DAY = 'gas_price_for_the_day';


@Service()
export default class GasStationChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
    //initializing cache
    this.cached.setCache(THRESHOLD_FLAG, true);
    this.cached.setCache(GAS_PRICE_FOR_THE_DAY, 0);
  }

  //To form and write to smart contract
  public async sendMessageToContract() {
    const logger = this.logger;

    logger.debug('Getting gas price, forming and uploading payload and interacting with smart contract...');

    return await new Promise((resolve, reject) => {
      this.getGasPrice()
      .then(info =>{
        if(!info.changed){
          const message = "Gas price status not changed";

          resolve({
            success: message
          });

          logger.info(message);
        }
        else{
          this.getNewPrice(info)
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

  // To get the gas price
  public async getGasPrice() {
    const logger = this.logger;
    const cache = this.cached;

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
        let movingAverageGasForTheLast90DaysFromMongoDB = await this.getAverageGasPrice();
        logger.info('moving average gas: %o', movingAverageGasForTheLast90DaysFromMongoDB.average);

        // assigning the threshold to a variable
        let flag = await cache.getCache(THRESHOLD_FLAG);


        // checks if the result gotten every 10 minutes is higher than the movingAverageGasForTheLast90DaysFromMongoDB
        if (movingAverageGasForTheLast90DaysFromMongoDB.average < averageGas10Mins && flag == 'true') {
          const info = {
            changed: true,
            gasHigh: true,
            currentPrice: averageGas10Mins,
            averagePrice: movingAverageGasForTheLast90DaysFromMongoDB.average
          }

          resolve(info);
          cache.setCache(THRESHOLD_FLAG, false);
        }

        // checks if the result gotten every 10 minutes is less than the movingAverageGasForTheLast90DaysFromMongoDB
        else if (movingAverageGasForTheLast90DaysFromMongoDB.average > averageGas10Mins && flag == 'false') {
          const info = {
            changed: true,
            gasHigh: false,
            currentPrice: averageGas10Mins,
            averagePrice: movingAverageGasForTheLast90DaysFromMongoDB.average
          }

          resolve(info);

          cache.setCache(THRESHOLD_FLAG, true);
        }
        else{
          const info = {
            changed: false
          }

          resolve(info);
        }
        const afterIfStatement = await cache.getCache(THRESHOLD_FLAG)
        logger.info('flag: %o', afterIfStatement)
      });
    });
  }

  // To get new gas price
  public async getNewPrice(info) {
    const logger = this.logger;

    return await new Promise((resolve, reject) => {
      const gasPrice = Math.trunc(info.currentPrice);

      let title;
      let payloadTitle;

      let message;
      let payloadMsg;

      if (info.gasHigh) {
        // Gas is high
        title = 'Eth Gas Price Movement';
        payloadTitle = `Eth Gas Price Movement ⬆`;

        message = `Eth Gas Price is over the usual average, current cost: ${gasPrice} Gwei`;
        payloadMsg = `[t:⬆] Gas Price are way above the normal rates. \n\n [d:Current] Price: [t: ${gasPrice} Gwei]\n[s:Usual] Price: [b: ${info.averagePrice} Gwei] [timestamp: ${Math.floor(new Date() / 1000)}]`;
      }
      else {
        // Gas will be low
        title = 'Eth Gas Price Movement';
        payloadTitle = `Eth Gas Price Movement ⬇`;

        message = `Eth Gas Price is back to normal, current cost: ${gasPrice} Gwei`;
        payloadMsg = `[d:⬇] Hooray! Gas Price is back to normal rates. \n\n Current Price: [d: ${gasPrice} Gwei]\n[s:Usual] Price: [b: ${info.averagePrice} Gwei] [timestamp: ${Math.floor(new Date() / 1000)}]`;
      }

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

  // To update gas price average
  public async updateGasPriceAverage() {
    const logger = this.logger;
    const cache = this.cached;

    logger.debug('updating mongodb');

    let gasPriceEstimate = await cache.getCache(GAS_PRICE_FOR_THE_DAY);
    if (!gasPriceEstimate || gasPriceEstimate == "0") {
      await this.getGasPrice();
      gasPriceEstimate = await cache.getCache(GAS_PRICE_FOR_THE_DAY);
    }

    logger.info('todays average gas price before revert: %o', gasPriceEstimate)

    const todaysAverageGasPrice = gasPriceEstimate;
    logger.info('todays average gas price: %o', todaysAverageGasPrice);

    await cache.setCache(GAS_PRICE_FOR_THE_DAY, 0);
    const gasPriceAfterRever = await cache.getCache(GAS_PRICE_FOR_THE_DAY)
    logger.info('todays average gas price after revert: %o', gasPriceAfterRever);

    let movingAverageForYesterdayFromMongoDB = await this.getAverageGasPrice();
    logger.info('last 90 days moving average: %o', movingAverageForYesterdayFromMongoDB.average);

    let todaysMovingAverage = Number(todaysAverageGasPrice)
    if (movingAverageForYesterdayFromMongoDB.average != 0) {
      todaysMovingAverage =
      ((movingAverageForYesterdayFromMongoDB.average * 90) + (todaysAverageGasPrice * 1)) / (90 + 1);
    }
    logger.info('todays moving average: %o', todaysMovingAverage)

    await this.setGasPrice(todaysMovingAverage);

    return { average: todaysMovingAverage }
  }

  // GAS PRICE HELPER METHODS
  // ----------
  /**
   * Set gas price
   * @description adds average gas price for a day to mongodb
   * @param {Number} price
   * @return {Promise<{ gasPrice: IGas }>}
   */
  public async setGasPrice(price: Number): Promise<{ gasPrice: IGas }> {
    this.GasPriceModel = Container.get('GasPriceModel');
    const gasPrice = await this.GasPriceModel.find()
        .sort({ _id: -1 })
      .limit(1);
    let new_price = price
    if (gasPrice.length > 0) {
      new_price = Number(gasPrice[0].price) + Number(price)
      new_price = Number(new_price) / 2
    }
    this.logger.info('gas price set: %o, price: %o', new_price, price);
    let latestGasPrice = await this.GasPriceModel.create({
      price: new_price,
    });
    if (!latestGasPrice) {
      throw new Error('Gas Price cannot be created');
    }
    latestGasPrice = latestGasPrice.toObject();
    return { gasPrice: latestGasPrice };
  }

  /**
   * Get average gas price
   * @description returns average gas price for a number of days from mongodb
   * @return {Promise<{ average: Number }>}
   */
  public async getAverageGasPrice(): Promise<{ average: Number }> {
    // this.logger.silly('Get gas price');
    this.GasPriceModel = Container.get('GasPriceModel');
    try {
      const gasPrices = await this.GasPriceModel.find()
        .sort({ _id: -1 })
        .limit(1);
      let price = 0;
      if (gasPrices.length > 0) {
        price = gasPrices[0].price
      }
      return { average: price };
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Two DP
   * @description round up a float value top 2 decimal places
   * @param {Number} value
   * @return {Number}
   */
  public twoDP(value: Number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  public async clearGasPrices(): Promise<null> {
    // this.logger.silly('Get gas price');
    this.GasPriceModel = Container.get('GasPriceModel');
    await this.GasPriceModel.deleteMany({});
    return null;
  }
}
