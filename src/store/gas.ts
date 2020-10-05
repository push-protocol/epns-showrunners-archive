import redis from '../helpers/redisHelper';

const GAS_PRICE = 'gasprice';

const setGasPrice = async (price: Number) => {
  await redis.publisher.set(GAS_PRICE, price);
};

const removeGasPrice = async () => {
  await redis.publisher.decr(GAS_PRICE);
};

const getGasPrice = async () => {
  return redis.publisher.get(GAS_PRICE);
};

module.exports = {
  setGasPrice,
  removeGasPrice,
  getGasPrice,
};
