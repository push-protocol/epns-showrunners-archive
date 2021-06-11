import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import AlphaHomora from '../../showrunners/alphaHomoraChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/alphahomora', route);

  // to add an incoming feed
  route.post(
    '/send_message',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/alphahomora/send_message ticker endpoint with body: %o', req.body )
      try {
        const alphahomora = Container.get(AlphaHomora);
        const response = await alphahomora.sendMessageToContract(req.body.simulate);
        return res.status(201).json(response);
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
