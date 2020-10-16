import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import EthGasStationChannel from '../../showrunners/ethGasChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/gasi', route);

  // to add an incoming feed
  route.post('/send_message', middlewares.onlyLocalhost, async (req: Request, res: Response, next: NextFunction) => {
    const Logger = Container.get('logger');
    Logger.debug('Calling /showrunners/compoundliquidation endpoint with body: %o', req.body);
    try {
      const ethGasChannel = Container.get(EthGasStationChannel);
      const average = await ethGasChannel.updateMongoDb();

      return res.status(201).json(average );
    } catch (e) {
      Logger.error('🔥 error: %o', e);
      return next(e);
    }
  });
};