'use strict';
import redis from '../helpers/redisHelper';

/**
 * Set cache
 * @description adds a part
 * @param {String} key Cache Key
 * @param {String} value Cache Value
 * @return {Promise<{ null }>}
 */
const setCache = async (key: String, value) => {
  await redis.client.set(key, value);
};

/**
 * Add cache
 * @description adds to already existing value in cache
 * @param {String} key Cache Key
 * @param {Number} value Value to be added
 * @return {Promise<{ null }>}
 */
const addCache = async (key: String, value: Number) => {
  const prev = await getCache(key);
  value = Number(prev) + Number(value);
  await redis.client.set(key, value);
};

/**
 * Remove cache
 * @description deletes a cache key and its associated values
 * @param {String} key Cache Key
 * @return {Promise<{ null }>}
 */
const removeCache = async (key: String) => {
  await redis.client.del(key);
};

/**
 * Get cache
 * @description retrieves the value of a cache key
 * @param {String} key Cache Key
 * @return {Promise<{ String }>}
 */
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
