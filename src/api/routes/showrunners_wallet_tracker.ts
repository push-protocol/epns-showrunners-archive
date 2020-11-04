import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import WalletTrackerChannel from '../../showrunners/walletTrackerChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/wallet_tracker', route);

  // for checking and sending gas price alerts
  route.post(
    '/send_message',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.onSubscription(req.body.address);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
