const redis = require('async-redis');

export default async (options): Promise<Any> => {
  return redis.createClient(options);
};
