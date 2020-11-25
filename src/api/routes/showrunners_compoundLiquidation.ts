import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import CompoundLiquidationChannel from '../../showrunners/compoundLiquidationChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import { handleResponse } from '../../helpers/utilsHelper';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/compound', route);
  
  /**
   * Send Message
   * @description Send a notification via the compound showrunner
   * @param {boolean} simulate whether to send the actual message or simulate message sending
   */
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
      Logger.debug('Calling /showrunners/compoundliquidation/send_message endpoint with body: %o', req.body )
      try {
        const compoundLiquidation = Container.get(CompoundLiquidationChannel);
        const { success,  data } = await compoundLiquidation.sendMessageToContract(req.body.simulate);

        return handleResponse(res, 201, true, success, data);
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );

  /**
   * Check Liquidity
   * @description check the liquidity of a given address
   * @param {string} address User Address
   */
  route.post(
    '/check_liquidity',
    celebrate({
      body: Joi.object({
        address: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const { address } = req.body;
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/compoundliquidation/check_liquidity endpoint with body: %o', req.body )
      try {
        const compoundLiquidation = Container.get(CompoundLiquidationChannel);
        const data = await compoundLiquidation.checkLiquidity(null, address);
        console.log(data)
        if (data.success && data.success == false) {
          return handleResponse(res, 500, false, "liquidity data", JSON.stringify(data.err));
        } else {
          return handleResponse(res, 200, true, "liquidity data", data);
        }
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );

  /**
   * Check Assets
   * @description check assets attached to a given address
   * @param {string} address User Address
   */
  route.post(
    '/check_assets',
    celebrate({
      body: Joi.object({
        address: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const { address } = req.body;
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/compoundliquidation/check_assets endpoint with body: %o', req.body )
      try {
        const compoundLiquidation = Container.get(CompoundLiquidationChannel);
        const data = await compoundLiquidation.checkAssets(null, address);
        if (data.success && data.success != false) {
          return handleResponse(res, 500, false, "assets data", JSON.stringify(data.err));
        } else {
          return handleResponse(res, 200, true, "assets data", data);
        }
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );

  /**
   * Total Users
   * @param {String} address User Address
   * @param {boolean} simulate whether to send the actual message or simulate message sending
   */
  route.post(
    '/total_users',
    celebrate({
      body: Joi.object({
        simulate: Joi.bool(),
        address: Joi.string().required(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const { address, simulate } = req.body;
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/compoundliquidation/total_users endpoint with body: %o', req.body )
      try {
        const compoundLiquidation = Container.get(CompoundLiquidationChannel);
        const data = await compoundLiquidation.getUsersTotal(null, address, simulate);
        if (data.success && data.success != false) {
          return handleResponse(res, 500, false, "total users", JSON.stringify(data.err));
        } else {
          return handleResponse(res, 200, true, "total users", data);
        }
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );
};

