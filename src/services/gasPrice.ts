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
      .sort({ created_at: -1 })
      .limit(Number(days));

    console.log(gasPrices);

    // this.logger.silly('calculaste average');
    const totalGas = gasPrices.reduce((initial, value) => initial + value.price, 0);
    const average = totalGas / Number(days);
    return { average };
  } catch (error) {
    console.log(error);
  }
};

const exportMongo = {
  setGasPrice,
  getAverageGasPrice,
};
export default exportMongo;
