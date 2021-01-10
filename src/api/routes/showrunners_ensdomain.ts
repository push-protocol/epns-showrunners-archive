import { Router, Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import EnsExiprationChannel from '../../showrunners/ensExpirationChannel';
import middlewares from '../middlewares';
import { celebrate, Joi } from 'celebrate';
import { handleResponse } from '../../helpers/utilsHelper';

const route = Router();

export default (app: Router) => {
  app.use('/showrunners/ensdomain', route);

  /**
   * Send Message
   * @description Send a notification via the ensdomain showrunner
   * @param {boolean} simulate whether to send the actual message or simulate message sending
   */
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
      Logger.debug('Calling /showrunners/ensdomain/send_message endpoint with body: %o', req.body )
      try {
        const ensDomain = Container.get(EnsExiprationChannel);
        const data = await ensDomain.sendMessageToContract(req.body.simulate);
        if (data.success && data.success == false) {
          return handleResponse(res, 500, false, "send message", JSON.stringify(data.err));
        } else {
          return handleResponse(res, 200, true, "send message", data);
        }
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );

  /**
   * Check Expiry
   * @description check if an adress's ens domain subscription is about to expire
   * @param {boolean} simulate whether to send the actual message or simulate message sending
   */
  route.post(
    '/check_expiry',
    celebrate({
      body: Joi.object({
        network: Joi.string().required(),
        address: Joi.string().required(),
        triggerThresholdInSecs: Joi.number().required(),
        simulate: Joi.object(),
      }),
    }),
    middlewares.onlyLocalhost,
    async (req: Request, res: Response, next: NextFunction) => {
      const Logger = Container.get('logger');
      Logger.debug('Calling /showrunners/ensdomain/check_expiry endpoint with body: %o', req.body )
      try {
        const { address, network, triggerThresholdInSecs, simulate } = req.body;

        const ensDomain = Container.get(EnsExiprationChannel);
        const data = await ensDomain.checkENSDomainExpiry(network, null, address, triggerThresholdInSecs, simulate);

        if (data.success && data.success == false) {
          return handleResponse(res, 500, false, "Expiry data", JSON.stringify(data.err));
        } else {
          return handleResponse(res, 200, true, "Expiry data", data);
        }
      } catch (e) {
        Logger.error('🔥 error: %o', e);
        return handleResponse(res, 500, false, 'error', JSON.stringify(e));
      }
    },
  );
};
