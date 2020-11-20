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
    '/get_supported_erc20s_array',
    celebrate({
      body: Joi.object({
        provider: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/get_supported_erc20s_array endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = walletTracker.getSupportedERC20sArray(req.body.provider);
        Logger.info("result: %o", result)

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/check_wallet_movement',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        provider: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/check_wallet_movement endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.checkWalletMovement(req.body.user, req.body.provider, null);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/check_token_movement',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        provider: Joi.string().required(),
        ticker: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/check_token_movement endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.checkTokenMovement(req.body.user, req.body.provider, req.body.ticker, null);

        return res.status(201).json({ success, data });
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_token_balance',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        provider: Joi.string().required(),
        ticker: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/get_token_balance endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const { success, data} = await walletTracker.getTokenBalance(req.body.user, req.body.provider, req.body.ticker, null);

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
    '/add_token_to_db',
    celebrate({
      body: Joi.object({
        ticker: Joi.string().required(),
        address: Joi.string().required(),
        decimals: Joi.number().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/add_token_to_db endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.addTokenToDB(req.body.ticker, req.body.address, req.body.decimals);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/add_tokens',
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
    '/clear_token_db',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/clear_token_db endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.clearTokenDB();

        return res.status(201).json({ result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/clear_user_token_db',
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/clear_user_token_db endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.clearUserTokenDB();

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );


  

};
