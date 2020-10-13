'use strict';
import redis from '../helpers/redisHelper';

const setCache = async (key: String, value) => {
  await redis.client.set(key, value);
};

const addCache = async (key: String, value: Number) => {
  const prev = await getCache(key);
  value = Number(prev) + Number(value);
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
  addCache,
  getCache,
};
export default exportCache;
