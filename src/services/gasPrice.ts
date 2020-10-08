import { Service, Inject } from 'typedi';
import GasPriceModel from '../models/gasPrice';
import { IGas } from '../interfaces/IGas';
import config from '../config';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';

@Service()
export default class GasPriceService {
  constructor(@Inject('logger') private logger) {}

  public async setGasPrice(price: Number): Promise<{ gasPrice: IGas }> {
    try {
      this.logger.silly('Set gas price');
      let gasPrice = await GasPriceModel.create({
        price,
      });
      if (!gasPrice) {
        throw new Error('User cannot be created');
      }
      gasPrice = gasPrice.toObject();
      return { gasPrice };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }

  public async getAverageGasPrice(days: Number): Promise<{ average: Number }> {
    try {
      this.logger.silly('Get gas price');
      const gasPrices = await GasPriceModel.find()
        .sort({ $created_at: -1 })
        .limit(Number(days));

      this.logger.silly('calculaste average');
      const totalGas = gasPrices.reduce((initial, value) => initial + value.price, 0);
      const average = totalGas / Number(days);
      return { average };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  }
}
