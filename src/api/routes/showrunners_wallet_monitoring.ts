import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import walletMonitoringChannel from '../../showrunners/walletMonitoringChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/wallet_monitoring', route);

  route.post(
    '/check_wallets',
    celebrate({
      body: Joi.object({
        simulate: Joi.bool(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_monitoring/check_wallets endpoint with body: %o', req.body )
      try {
        const walletMonitor = Container.get(walletMonitoringChannel);
        const result = await walletMonitor.processWallets(req.body.simulate);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
