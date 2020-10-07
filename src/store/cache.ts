'use strict';
import redis from '../helpers/redisHelper';

const GAS_PRICE = 'gasprice';
const THRESHOLD_FLAG = 'threshold_flag';

const setCache = async (key, value: String) => {
  await redis.publisher.set(key, value);
};

const removeCache = async key => {
  await redis.publisher.del(key);
};

const getCache = async key => {
  return redis.publisher.get(key);
};

module.exports = {
  setCache,
  removeCache,
  getCache,
};
