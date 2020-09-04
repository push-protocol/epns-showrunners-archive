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


export default ({ logger }) => {
  // 1. SHOWRUNNERS SERVICE

  // 1.1 BTC TICKER CHANNEL
  logger.info('-- 🛵 Scheduling Showrunner - BTC Ticker Channel [on 6 Hours]');
  schedule.scheduleJob('0 0 */6 * * *', async function(){
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
  logger.info('-- 🛵 Scheduling Showrunner - ETH Ticker Channel [on 6 Hours]');
  schedule.scheduleJob('0 0 */6 * * *', async function(){
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


// 1.3 ENS TICKER CHANNEL
// logger.info('-- 🛵 Scheduling Showrunner - ENS Domain Expiry Channel [on 24 Hours]');
// schedule.scheduleJob('0 0 */24 * * *', async function(){
//   const ensTicker = Container.get(EnsExpirationChannel);
//   const taskName = 'ENS Domain Expiry and sendMessageToContract()';
//
//   try {
//     await ensTicker.sendMessageToContract();
//     logger.info(`🐣 Cron Task Completed -- ${taskName}`);
//   }
//   catch (err) {
//     logger.error(`❌ Cron Task Failed -- ${taskName}`);
//     logger.error(`Error Object: %o`, err);
//   }
// });
};
