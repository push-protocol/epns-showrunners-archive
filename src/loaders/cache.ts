const redis = require('async-redis');
import config from '../config';

class CacheInstance {
  private ReddisInstance;
  constructor() {
    this.ReddisInstance = redis.createClient(config.redisURL);
  }
  /**
   * Set cache
   * @description adds a part
   * @param {String} key Cache Key
   * @param {String} value Cache Value
   * @return {Promise<{ null }>}
   */
  public async setCache(key: String, value: Number) {
    return this.ReddisInstance.set(key, value);
  };

  /**
   * Set hash cache
   * @description adds a part
   * @param {String} hash Hash Key
   * @param {String} key Cache Key
   * @param {String} value Cache Value
   * @return {Promise<{ null }>}
   */
  public async sethashCache(hash: String, key: String, value: Number) {
    return this.ReddisInstance.hset(hash, key, value);
  };

  /**
   * Add caches
   * @description adds to already existing value in cache
   * @param {String} key Cache Key
   * @param {Number} value Value to be added
   * @return {Promise<{ null }>}
   */
  public async addCache(key: String, value: Number) {
    const prev = await this.getCache(key);
    if (prev != 0) {
      value = Number(prev) + Number(value);
      value = Number(value) / 2
    }
    return this.ReddisInstance.set(key, value);
  };

  /**
   * Remove cache
   * @description deletes a cache key and its associated values
   * @param {String} key Cache Key
   * @return {Promise<{ null }>}
   */
  public async removeCache(key: String) {
    return this.ReddisInstance.del(key);
  };

  /**
   * Remove hash cache
   * @description deletes a hash cache key and its associated values
   * @param {String} hash Hash Key
   * @param {String} key Cache Key
   * @return {Promise<{ null }>}
   */
  public async removeHashCache(hash: String, key: String) {
    return this.ReddisInstance.hdel(hash, key);
  };

  /**
   * Get cache
   * @description retrieves the value of a cache key
   * @param {String} key Cache Key
   * @return {Promise<{ String }>}
   */
  public async getCache(key: String) {
    return this.ReddisInstance.get(key);
  };

  /**
   * Get hash cache
   * @description retrieves the value of a hash cache key
   * @param {String} hash Hash Key
   * @param {String} key Cache Key
   * @return {Promise<{ String }>}
   */
  public async getHashCache(hash: String, key: String) {
    return this.ReddisInstance.hget(hash, key);
  };

}


export default new CacheInstance();
