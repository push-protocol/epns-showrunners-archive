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
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';


import BtcTickerChannel from '../showrunners/btcTickerChannel';
import EthTickerChannel from '../showrunners/ethTickerChannel';
import EnsExpirationChannel from '../showrunners/ensExpirationChannel';
import EthGasStationChannel from '../showrunners/ethGasChannel';
import CompoundLiquidationChannel from '../showrunners/compoundLiquidationChannel';
import Everest from '../showrunners/everestChannel';
import WalletTrackerChannel from '../showrunners/walletTrackerChannel';
import WalletMonitoring from '../helpers/walletMonitoring';


export default ({ logger }) => {
  // 1. SHOWRUNNERS SERVICE

  // 1.1 BTC TICKER CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - BTC Ticker Channel [on 6 Hours]');
  schedule.scheduleJob('0 0 */6 * * *', async function(){
    const btcTicker = Container.get(BtcTickerChannel);
    const taskName = 'BTC Ticker Fetch and sendMessageToContract()';

    try {
      await btcTicker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.2 ETH TICKER CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - ETH Ticker Channel [on 6 Hours]');
  schedule.scheduleJob('0 0 */6 * * *', async function(){
    const ethTicker = Container.get(EthTickerChannel);
    const taskName = 'ETH Ticker Fetch and sendMessageToContract()';

    try {
      await ethTicker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });


  //1.3 ENS TICKER CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - ENS Domain Expiry Channel [on 24 Hours]');
  schedule.scheduleJob('0 0 */24 * * *', async function(){
    const ensTicker = Container.get(EnsExpirationChannel);
    const taskName = 'ENS Domain Expiry and sendMessageToContract()';

    try {
      await ensTicker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.4.1 GAS CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - Gas Price Checker [on 10 minutes]');
  schedule.scheduleJob('0 */10 * * * *', async function(){
    const gasTicker = Container.get(EthGasStationChannel);
    const taskName = 'Gas result and sendMessageToContract()';

    try {
      await gasTicker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.4.2 GAS CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - Gas Average Update [on 24 hours]');
  schedule.scheduleJob('0 0 */24 * * *', async function(){
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
  logger.info('-- 🛵 Scheduling Showrunner - Compound Liquidation Channel [on 24 Hours]');
  schedule.scheduleJob('0 0 */24 * * *', async function(){
    const compoundTicker = Container.get(CompoundLiquidationChannel);
    const taskName = 'Compound Liquidation address checks and sendMessageToContract()';

    try {
      await compoundTicker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.6 EVEREST CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - Everest Channel [on 24 Hours]');
  schedule.scheduleJob('0 0 */24 * * *', async function(){
    const everestTicker = Container.get(Everest);
    const taskName = 'Everest event checks and sendMessageToContract()';

    try {
      await everestTicker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.7 Wallets Monitoring CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - Wallets Monitoring [every Hour]');
  schedule.scheduleJob('0 0 */1 * * *', async function(){
    const walletMonitoring = Container.get(WalletMonitoring);
    const taskName = 'WalletMonitoring event checks and processWallet()';

    try {
      await walletMonitoring.processWallets(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  // 1.7.2 Main Wallet Monitoring CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - Main Wallets Monitoring [every Hour]');
  schedule.scheduleJob('0 0 */1 * * *', async function(){
    const walletMonitoring = Container.get(WalletMonitoring);
    const taskName = 'Main Wallet Monitoring event checks and processWallet()';

    try {
      await walletMonitoring.processMainWallet(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  });

  const eventDispatcher = Container.get(EventDispatcherInterface);
  eventDispatcher.on("newBlockMined", async function (data) {
    const walletTracker = Container.get(WalletTrackerChannel);
    const taskName = 'Track wallets on every new block mined';

    try {
      await walletTracker.sendMessageToContract(false);
      logger.info(`🐣 Cron Task Completed -- ${taskName}`);
    }
    catch (err) {
      logger.error(`❌ Cron Task Failed -- ${taskName}`);
      logger.error(`Error Object: %o`, err);
    }
  })
};
