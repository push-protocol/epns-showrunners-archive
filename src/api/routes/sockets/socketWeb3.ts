import { Container } from 'typedi';
import config from '../../../config';
import { ethers } from 'ethers';
// import epnsNotify from '../../../helpers/epnsNotifyHelper';
import { EventDispatcher, EventDispatcherInterface } from '../../../decorators/eventDispatcher';
// let epns;
function initializeEPNS(logger, eventDispatcher) {
  try {
    const provider = new ethers.providers.AlchemyWebSocketProvider(3, config.alchemyAPI);
    // EXAMPLE
    provider.on('block', (blockNumber) => {
      logger.info(`🐣 New block mined! -- ${blockNumber}`);
      eventDispatcher.dispatch("newBlockMined", blockNumber)
    })
  } catch (error) {
    console.log(error)
    // initializeEPNS(logger, eventDispatcher)
  }
}

export default async (app: Router) => {
  const logger = Container.get('logger');
  const eventDispatcher = Container.get(EventDispatcherInterface);
  initializeEPNS(logger, eventDispatcher)
}

