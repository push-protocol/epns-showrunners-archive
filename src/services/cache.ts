'use strict';
import redis from '../helpers/redisHelper';

const setCache = async (key: String, value) => {
  await redis.client.set(key, value);
};

const removeCache = async (key: String) => {
  await redis.client.del(key);
};

const getCache = async (key: String) => {
  return redis.client.get(key);
};

const exportCache = {
  setCache,
  removeCache,
  getCache,
};
export default exportCache;
