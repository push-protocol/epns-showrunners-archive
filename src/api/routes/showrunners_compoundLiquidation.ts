import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import CompoundLiquidationChannel from '../../showrunners/compoundLiquidationChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/compound', route);

  // to add an incoming feed
  route.post(
    '/send_message',
    celebrate({
      body: Joi.object({
        simulate: Joi.bool(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/compoundliquidation endpoint with body: %o', req.body )
      try {
        const compoundLiquidation = Container.get(CompoundLiquidationChannel);
        const { success,  data } = await compoundLiquidation.sendMessageToContract(req.body.simulate);

        return res.status(201).json({ success,  data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );


};
