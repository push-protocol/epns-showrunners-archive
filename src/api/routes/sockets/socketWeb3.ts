import { Container } from 'typedi';
import config from '../../../config';
import epnsNotify from '../../../helpers/epnsNotifyHelper';
import { EventDispatcher, EventDispatcherInterface } from '../../../decorators/eventDispatcher';
let epns;

function initializeEPNS(logger, eventDispatcher) {
  epns = epnsNotify.getInteractableContracts(
    config.web3RopstenNetwork,                                      // Network for which the interactable contract is req
    {                                                               // API Keys
      etherscanAPI: config.etherscanAPI,
      infuraAPI: config.infuraAPI,
      alchemyAPI: config.alchemyAPI
    },
    config.btcTickerPrivateKey,                                     // Private Key of the Wallet sending Notification
    config.deployedContract,                                        // The contract address which is going to be used
    config.deployedContractABI                                      // The contract abi which is going to be useds
  );
  // EXAMPLE
  epns.provider.on('block', (blockNumber) => {
    logger.info(`🐣 New block mined! -- ${blockNumber}`);
    eventDispatcher.dispatch("newBlockMined", blockNumber)
  })
}

export default async (app: Router) => {
  const logger = Container.get('logger');
  const eventDispatcher = Container.get(EventDispatcherInterface);
  initializeEPNS(logger, eventDispatcher)
  const thirtyMins = 30 * 60 * 1000; // Thirty mins
  setInterval(function(){
    initializeEPNS(logger, eventDispatcher)
  }, thirtyMins);
}

