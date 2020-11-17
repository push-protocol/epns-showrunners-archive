import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import WalletTrackerChannel from '../../showrunners/walletTrackerChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/wallet_tracker', route);

  route.post(
    '/send_message',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.sendMessageToContract();

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/checkTokenMovement',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        provider: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.checkTokenMovement(req.body.user, req.body.provider);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getTokenBalance',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.getTokenBalance(req.body.user, req.body.token, req.body.provider);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/checkTokenMovement',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.checkTokenMovement(req.body.user, req.body.provider);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/compareTokenBalance',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.compareTokenBalance(req.body.userToken, req.body.userTokenFromDB);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getWalletTrackerPayload',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.getWalletTrackerPayload(req.body.changedTokens);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getTokenBalanceFromDB',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.getTokenBalanceFromDB(req.body.userAddress, req.body.tokenID);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/getTokenByAddress',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.getTokenByAddress(req.body.tokenAddress);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/addTokenToDB',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.addTokenToDB(req.body.symbol, req.body.address, req.body.decimals);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/clearTokenDB',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.clearTokenDB();

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/clearUserTokenDB',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.clearUserTokenDB();

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/addUserTokenToDB',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.addUserTokenToDB(req.body.user, req.body.tokenID, req.body.balance);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/updateUserTokenBalance',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.updateUserTokenBalance(req.body.user, req.body.tokenID, req.body.balance);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/addTokens',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/add_tokens endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.addTokens();

        return res.status(201).json({ success, data});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
