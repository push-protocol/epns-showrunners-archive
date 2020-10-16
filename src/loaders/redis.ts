import Logger from '../loaders/logger';

const redis = require('async-redis');

export default async (): Promise<Any> => {
  const cache = async function ({ options }) {
    return redis.createClient(options);
  }
};
