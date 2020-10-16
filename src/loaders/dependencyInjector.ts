import { Container } from 'typedi';
import LoggerInstance from './logger';

import config from '../config';

export default ({
  redisCache,
  mongoConnection,
  models,
}: {
  redisCache;
  mongoConnection;
  models: { name: string; model: any }[];
}) => {
  try {
    models.forEach(m => {
      console.log(m);
      Container.set(m.name, m.model);
    });
    LoggerInstance.info('✌️   Mongoose Injected');
    Container.set('logger', LoggerInstance);
    LoggerInstance.info('✌️   Logger Injected');
    Container.set('redis', redisCache);
    LoggerInstance.info('✌️   Redis Injected');
    // Container.set('mongoose', mongoConnection);

    //
    // Container.set('dbpool', MysqlInstance)
    // LoggerInstance.info('✌️   Databse Injected');

    return null;
  } catch (e) {
    LoggerInstance.error('🔥  Error on dependency injector loader: %o', e);
    throw e;
  }
};
