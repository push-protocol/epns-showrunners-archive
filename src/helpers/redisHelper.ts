const redis = require('redis');
const { promisify } = require('util');

class RedisService {
  publisher;
  constructor() {
    // const productionEnvironment = process.env.NODE_ENV === 'production';
    // const testEnvironment = process.env.NODE_ENV === 'test';

    const options = {
      url: process.env.REDIS_URL,
      // ...(productionEnvironment && {
      //     password: String(process.env.REDIS_PASSWORD)
      // })
    };

    this.publisher = redis.createClient(options);

    const commands = ['del', 'set', 'get', 'quit', 'exists', 'keys'];

    // promisify all the specified commands
    commands.forEach(command => {
      this[command] = promisify(this.publisher[command]).bind(this.publisher);
    });

    this.publisher.on('ready', async () => {
      console.log('🐳 Redis Connected!');
    });

    this.publisher.on('error', err => {
      console.log(err, 'An error occured with the Redis client.');
    });
  }
}

export default new RedisService();
