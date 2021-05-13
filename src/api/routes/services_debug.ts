import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import Debug from '../../services/debug';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/services/debug', route);

  /**
   * Track SendNotification
   * @description Tracks the SendNotification event on EPNSCore contract
   * @param {boolean} simulate whether to send the actual message or simulate message sending
   */
  route.post(
    '/trackSendNotification',
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /services/debug/trackSendNotification endpoint with body: %o', req.body )
      try {
        const debug = Container.get(Debug);
        const result = await debug.trackSendNotification(req.body.simulate);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

};
