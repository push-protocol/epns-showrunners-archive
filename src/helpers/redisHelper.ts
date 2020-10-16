const redis = require('async-redis');
// const { promisify } = require('util');

class RedisService {
  client;
  constructor() {
    // const productionEnvironment = process.env.NODE_ENV === 'production';
    // const testEnvironment = process.env.NODE_ENV === 'test';

    const options = {
      url: process.env.REDIS_URL,
      // ...(productionEnvironment && {
      //     password: String(process.env.REDIS_PASSWORD)
      // })
    };

    this.client = redis.createClient(options);

    // const commands = ['del', 'set', 'get', 'quit', 'exists', 'keys'];

    // // promisify all the specified commands
    // commands.forEach(command => {
    //   this[command] = promisify(this.client[command]).bind(this.client);
    // });

    this.client.on('ready', async () => {
      console.log('🐳 Redis Connected!');
    });

    this.client.on('error', err => {
      console.log(err, 'An error occured with the Redis client.');
    });
  }
}

export default new RedisService();
