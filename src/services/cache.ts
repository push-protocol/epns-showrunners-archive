'use strict';
import redis from '../helpers/redisHelper';

const GAS_PRICE = 'gasprice';
const THRESHOLD_FLAG = 'threshold_flag';

const setCache = async (key:String, value) => {
  await redis.publisher.set(key, value);
};

const removeCache = async (key:String) => {
  await redis.publisher.del(key);
};

const getCache = async (key:String) => {
  return redis.publisher.get(key);
};

const exportCache = {
  setCache,
  removeCache,
  getCache
}
export default exportCache

