import GasPriceModel from '../models/gasPrice';
import { IGas } from '../interfaces/IGas';

/**
 * Set gas price
 * @description adds average gas price for a day to mongodb
 * @param {Number} price
 * @return {Promise<{ gasPrice: IGas }>}
 */
const setGasPrice = async (price: Number): Promise<{ gasPrice: IGas }> => {
  let gasPrice = await GasPriceModel.create({
    price,
  });
  if (!gasPrice) {
    throw new Error('User cannot be created');
  }
  gasPrice = gasPrice.toObject();
  return { gasPrice };
};

/**
 * Get average gas price
 * @description returns average gas price for a number of days from mongodb
 * @param {Number} days
 * @return {Promise<{ average: Number }>}
 */
const getAverageGasPrice = async (days: Number): Promise<{ average: Number }> => {
  // this.logger.silly('Get gas price');
  try {
    if (days < 1) throw new Error('days must be less than 1');

    const gasPrices = await GasPriceModel.find()
      .sort({ _id: -1 })
      .limit(Number(days));

    console.log(gasPrices);

    // this.logger.silly('calculaste average');
    const totalGas = gasPrices.reduce((initial, value) => initial + value.price, 0);
    let average = totalGas / Number(days);
    average = Math.round((average + Number.EPSILON) * 100) / 100;
    return { average };
  } catch (error) {
    console.log(error);
  }
};

/**
 * Two DP
 * @description round up a float value top 2 decimal places
 * @param {Number} value
 * @return {Number}
 */
const twoDP = (value: Number) => {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
};

const clearGasPrices = async (): Promise<null> => {
  // this.logger.silly('Get gas price');
  await GasPriceModel.deleteMany({});
  return null;
};

const exportMongo = {
  setGasPrice,
  getAverageGasPrice,
  clearGasPrices,
  twoDP,
};
export default exportMongo;
