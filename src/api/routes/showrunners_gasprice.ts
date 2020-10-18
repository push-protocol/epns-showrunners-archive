import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import EthGasStationChannel from '../../showrunners/ethGasChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/gasprice', route);

  // for checking and sending gas price alerts
  route.post(
    '/send_message',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/gasprice/send_message endpoint with body: %o', req.body )
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const { success, data} = await ethGasChannel.sendMessageToContract();

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  // for updating average gas price
  route.post(
    '/update_gasprice_average',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/update_gasprice_average endpoint with body: %o', req.body )
      try {
        const ethGasChannel = Container.get(EthGasStationChannel);
        const average = await ethGasChannel.updateGasPriceAverage();

        return res.status(201).json(average );
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

};
