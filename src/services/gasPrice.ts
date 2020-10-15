import { Service, Inject } from 'typedi';
import GasPriceModel from '../models/gasPrice';
import { IGas } from '../interfaces/IGas';
import config from '../config';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Service()
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

const clearGasPrices = async (): Promise<null> => {
  // this.logger.silly('Get gas price');
  await GasPriceModel.deleteMany({});
  return null;
};

const exportMongo = {
  setGasPrice,
  getAverageGasPrice,
  clearGasPrices,
};
export default exportMongo;
