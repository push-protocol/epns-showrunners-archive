import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import CompoundLiquidationChannel from '../../showrunners/compoundLiquidationChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import {handleResponse} from '../../helpers/utilsHelper';
const epnsNotify = require('../../helpers/epnsNotifyHelper');
import config from '../../config';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/compound', route);
  const compound = epnsNotify.getInteractableContracts(
    config.web3RopstenProvider,                                              // Network for which the interactable contract is req
    {                                                                       // API Keys
      etherscanAPI: config.etherscanAPI,
      infuraAPI: config.infuraAPI,
      alchemyAPI: config.alchemyAPI
    },
    config.compComptrollerPrivateKey,                                       // Private Key of the Wallet sending Notification
    config.compComptrollerDeployedContract,                                             // The contract address which is going to be used
    config.compComptrollerDeployedContractABI                                           // The contract abi which is going to be useds
  );

  /**
   * Send message
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
   * @param {String} address User Address
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
        const data = await compoundLiquidation.checkLiquidity(compound, address);
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
   * @param {String} address User Address
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
        const data = await compoundLiquidation.checkAssets(compound, address);
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
   * Check Assets
   * @param {String} address User Address
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
        const data = await compoundLiquidation.getUsersTotal(compound, address, simulate);
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

