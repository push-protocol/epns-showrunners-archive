import { Service, Inject, Container } from 'typedi';

@Service()
export default class CacheService {
  constructor() {
    // this.client = Container.get('redis');
  }

  /**
   * Set cache
   * @description adds a part
   * @param {String} key Cache Key
   * @param {String} value Cache Value
   * @return {Promise<{ null }>}
   */
  public async setCache(key: String, value) {
    this.client = Container.get('redis');
    await this.client.set(key, value);
  }

  /**
   * Add caches
   * @description adds to already existing value in cache
   * @param {String} key Cache Key
   * @param {Number} value Value to be added
   * @return {Promise<{ null }>}
   */
  public async addCache(key: String, value: Number) {
    this.client = Container.get('redis');
    const prev = await this.getCache(key);
    value = Number(prev) + Number(value);
    await this.client.set(key, value);
  }

  /**
   * Remove cache
   * @description deletes a cache key and its associated values
   * @param {String} key Cache Key
   * @return {Promise<{ null }>}
   */
  public async removeCache(key: String) {
    this.client = Container.get('redis');
    await this.client.del(key);
  }

  /**
   * Get cache
   * @description retrieves the value of a cache key
   * @param {String} key Cache Key
   * @return {Promise<{ String }>}
   */
  getCache = async (key: String) => {
    this.client = Container.get('redis');
    return this.client.get(key);
  };
}
