import expressLoader from './express';
import dependencyInjectorLoader from './dependencyInjector';

import logger from './logger';

import jobsLoader from './jobs';
import dbLoader from './db';
import dbListenerLoader from './dbListener';

//We have to import at least all the events once so they can be triggered
import './events';

export default async ({ expressApp }) => {
  logger.info('✌️   Loaders connected!');

  const pool = await dbLoader();
  logger.info('✌️   Database connected!');

  // It returns the agenda instance because it's needed in the subsequent loaders
  await dependencyInjectorLoader({});
  logger.info('✌️   Dependency Injector loaded');

  logger.info('✌️   Loading DB Events listener');
  await dbListenerLoader({ pool, logger });
  logger.info('✌️   DB Listener loaded!');

  logger.info('✌️   Loading jobs');
  await jobsLoader({ logger });
  logger.info('✌️   Jobs loaded');

  await expressLoader({ app: expressApp });
  logger.info('✌️   Express loaded');
};
