// Do Scheduling
// https://github.com/node-schedule/node-schedule
// *    *    *    *    *    *
// ┬    ┬    ┬    ┬    ┬    ┬
// │    │    │    │    │    │
// │    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
// │    │    │    │    └───── month (1 - 12)
// │    │    │    └────────── day of month (1 - 31)
// │    │    └─────────────── hour (0 - 23)
// │    └──────────────────── minute (0 - 59)
// └───────────────────────── second (0 - 59, OPTIONAL)
// Execute a cron job every 5 Minutes = */5 * * * *
// Starts from seconds = * * * * * *

import config from '../config';
import { Container } from 'typedi';
import schedule from 'node-schedule';

import BtcTickerChannel from '../showrunners/btcTickerChannel';
import EthTickerChannel from '../showrunners/ethTickerChannel';
import EnsExpirationChannel from '../showrunners/ensExpirationChannel';
import EthGasStationChannel from '../showrunners/ethGasChannel';
import CompoundLiquidationChannel from '../showrunners/compoundLiquidationChannel';
import Everest from '../showrunners/everestChannel';


export default ({ logger }) => {
  // 1. SHOWRUNNERS SERVICE

  const sixHourRule = new schedule.RecurrenceRule();
  sixHourRule.hour = new schedule.Range(0, 23, 6);

  const dailyRule = new schedule.RecurrenceRule();
  dailyRule.hour = 0;
  dailyRule.minute = 0;
  dailyRule.second = 0;
  dailyRule.dayOfWeek = new schedule.Range(0, 6);
  
  const tenMinuteRule = new schedule.RecurrenceRule();
  tenMinuteRule.minute = new schedule.Range(0, 59, 10);


  // 1.1 BTC TICKER CHANNEL
  schedule.scheduleJob(sixHourRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - BTC Ticker Channel [on 6 Hours]');
    const btcTicker = Container.get(BtcTickerChannel);
    const taskName = 'BTC Ticker Fetch and sendMessageToContract()';

    try {
      await btcTicker.sendMessageToContract();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.2 ETH TICKER CHANNEL
  schedule.scheduleJob(sixHourRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - ETH Ticker Channel [on 6 Hours]');
    const ethTicker = Container.get(EthTickerChannel);
    const taskName = 'ETH Ticker Fetch and sendMessageToContract()';

    try {
      await ethTicker.sendMessageToContract();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });


  //1.3 ENS TICKER CHANNEL
  schedule.scheduleJob(dailyRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - ENS Domain Expiry Channel [on 24 Hours]');
    const ensTicker = Container.get(EnsExpirationChannel);
    const taskName = 'ENS Domain Expiry and sendMessageToContract()';

    try {
      await ensTicker.sendMessageToContract();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.4.1 GAS CHANNEL
  schedule.scheduleJob(tenMinuteRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - Gas Price Checker [on 10 minutes]');
    const gasTicker = Container.get(EthGasStationChannel);
    const taskName = 'Gas result and sendMessageToContract()';

    try {
      await gasTicker.sendMessageToContract();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.4.2 GAS CHANNEL
  schedule.scheduleJob(dailyRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - Gas Average Update [on 24 hours]');
    const gasDbTicker = Container.get(EthGasStationChannel);
    const taskName = 'updated mongoDb';

    try {
      await  gasDbTicker.updateGasPriceAverage();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.5 COMPOUND LIQUIDATION CHANNEL
  schedule.scheduleJob(dailyRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - Compound Liquidation Channel [on 24 Hours]');
    const compoundTicker = Container.get(CompoundLiquidationChannel);
    const taskName = 'Compound Liquidation address checks and sendMessageToContract()';

    try {
      await compoundTicker.sendMessageToContract();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.6 EVEREST CHANNEL
  schedule.scheduleJob(dailyRule, async function () {
    logger.info('-- 🛵 Scheduling Showrunner - Everest Channel [on 24 Hours]');
    const everestTicker = Container.get(Everest);
    const taskName = 'Everest event checks and sendMessageToContract()';

    try {
      await everestTicker.sendMessageToContract();
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });
};
