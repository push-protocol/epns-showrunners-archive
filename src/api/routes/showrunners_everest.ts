import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import Everest from '../../showrunners/everestChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/everest', route);

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
      Logger.debug('Calling /showrunners/everest ticker endpoint with body: %o', req.body )
      try {
        const everest = Container.get(Everest);
        const { success,  data } = await everest.sendMessageToContract(req.body.simulate);

        return res.status(201).json({ success,  data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/check_member_challenged_event',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/everest ticker endpoint with body: %o', req.body )
      try {
        const everest = Container.get(Everest);
        const { success,  data } = await everest.checkMemberChallengedEvent(null);

        return res.status(201).json({ success,  data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_transaction',
    celebrate({
      body: Joi.object({
        address: Joi.string().required(),
        simulate: Joi.bool(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/everest ticker endpoint with body: %o', req.body )
      try {
        const everest = Container.get(Everest);
        const { success,  data } = await everest.getTransaction(req.body.address,req.body.simulate);

        return res.status(201).json({ success,  data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_everest_challenge_message',
    celebrate({
      body: Joi.object({
        address: Joi.string().required()
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/everest ticker endpoint with body: %o', req.body )
      try {
        const everest = Container.get(Everest);
        const { success,  data } = await everest.getEverestChallengeMessage(req.body.address);

        return res.status(201).json({ success,  data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );


};
