const redis = require('async-redis');
import config from '../config';

export default ({ logger }) => {
  const ReddisInstance = redis.createClient( config.redisURL );

  /**
   * Set cache
   * @description adds a part
   * @param {String} key Cache Key
   * @param {String} value Cache Value
   * @return {Promise<{ null }>}
   */
  async function setCache(key: String, value: Number) {
    this.client = ReddisInstance;
    return this.client.set(key, value);
  };

  /**
   * Add caches
   * @description adds to already existing value in cache
   * @param {String} key Cache Key
   * @param {Number} value Value to be added
   * @return {Promise<{ null }>}
   */
  async function addCache(key: String, value: Number) {
    this.client = ReddisInstance;
    const prev = await this.getCache(key);
    value = Number(prev) + Number(value);
    return this.client.set(key, value);
  };

  /**
   * Remove cache
   * @description deletes a cache key and its associated values
   * @param {String} key Cache Key
   * @return {Promise<{ null }>}
   */
  async function removeCache(key: String) {
    this.client = ReddisInstance;
    return this.client.del(key);
  };

  /**
   * Get cache
   * @description retrieves the value of a cache key
   * @param {String} key Cache Key
   * @return {Promise<{ String }>}
   */
  async function getCache(key: String) {
    this.client = ReddisInstance;
    return this.client.get(key);
  };
}
