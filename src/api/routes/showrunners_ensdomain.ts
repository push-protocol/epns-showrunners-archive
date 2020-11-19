import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import EnsExiprationChannel from '../../showrunners/ensExpirationChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/ensdomain', route);

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
      Logger.debug('Calling /showrunners/ensticker endpoint with body: %o', req.body )
      try {
        const ensDomain = Container.get(EnsExiprationChannel);
        const { success,  data } = await ensDomain.sendMessageToContract(req.body.simulate);

        return res.status(201).json({ success,  data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );


};
