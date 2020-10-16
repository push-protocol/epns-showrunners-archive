import { Service, Inject, Container } from 'typedi';
import { IGas } from '../interfaces/IGas';

@Service()
export default class GasPriceMongoService {
  private GasPriceModel;
  constructor() {}

  /**
   * Set gas price
   * @description adds average gas price for a day to mongodb
   * @param {Number} price
   * @return {Promise<{ gasPrice: IGas }>}
   */
  public async setGasPrice(price: Number): Promise<{ gasPrice: IGas }> {
    this.GasPriceModel = Container.get('GasPriceModel');
    let gasPrice = await this.GasPriceModel.create({
      price,
    });
    if (!gasPrice) {
      throw new Error('User cannot be created');
    }
    gasPrice = gasPrice.toObject();
    return { gasPrice };
  }

  /**
   * Get average gas price
   * @description returns average gas price for a number of days from mongodb
   * @param {Number} days
   * @return {Promise<{ average: Number }>}
   */
  public async getAverageGasPrice(days: Number): Promise<{ average: Number }> {
    // this.logger.silly('Get gas price');
    this.GasPriceModel = Container.get('GasPriceModel');
    try {
      if (days < 1) throw new Error('days must be less than 1');

      const gasPrices = await this.GasPriceModel.find()
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
  }

  /**
   * Two DP
   * @description round up a float value top 2 decimal places
   * @param {Number} value
   * @return {Number}
   */
  public twoDP(value: Number) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  public async clearGasPrices(): Promise<null> {
    // this.logger.silly('Get gas price');
    this.GasPriceModel = Container.get('GasPriceModel');
    await this.GasPriceModel.deleteMany({});
    return null;
  }
}
