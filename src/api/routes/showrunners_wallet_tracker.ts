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
    celebrate({
      body: Joi.object({
        simulate: [Joi.bool(), Joi.object()],
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/send_message endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.sendMessageToContract(req.body.simulate);

        return res.status(201).json({result});
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
        simulate: Joi.bool(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/check_wallet_movement endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.checkWalletMovement(req.body.user, req.body.provider, req.body.simulate, null);

        return res.status(201).json({result});
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
        const result = await walletTracker.checkTokenMovement(req.body.user, req.body.provider, req.body.ticker, null);

        return res.status(201).json({result});
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
        const result = await walletTracker.getTokenBalance(req.body.user, req.body.provider, req.body.ticker, null);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );


  route.post(
    '/compare_token_balance',
    celebrate({
      body: Joi.object({
        tokenBalance: Joi.number().required(),
        tokenBalanceFromDB: Joi.number().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/compare_token_balance endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.compareTokenBalance(req.body.tokenBalance, req.body.tokenBalanceFromDB);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_payload_hash',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        simulate: Joi.bool(),
        changedTokens: Joi.array().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/get_wallet_tracker_payload endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.getPayloadHash(req.body.user, req.body.simulate, req.body.changedTokens);

        return res.status(201).json(result);
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_wallet_tracker_payload',
    celebrate({
      body: Joi.object({
        changedTokens: Joi.array().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/get_wallet_tracker_payload endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.getWalletTrackerPayload(req.body.changedTokens);

        return res.status(201).json(result);
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/get_token_balance_from_db',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        ticker: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/get_token_balance_from_db endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.getTokenBalanceFromDB(req.body.user, req.body.ticker);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/add_user_token_to_db',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        ticker: Joi.string().required(),
        balance: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/add_user_token_to_db endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.addUserTokenToDB(req.body.user, req.body.ticker, req.body.balance);

        return res.status(201).json({result});
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );



  route.post(
    '/update_user_token_balance',
    celebrate({
      body: Joi.object({
        user: Joi.string().required(),
        ticker: Joi.string().required(),
        balance: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/wallet_tracker/update_user_token_balance endpoint with body: %o', req.body )
      try {
        const walletTracker = Container.get(WalletTrackerChannel);
        const result = await walletTracker.updateUserTokenBalance(req.body.user, req.body.ticker, req.body.balance);

        return res.status(201).json({result});
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
