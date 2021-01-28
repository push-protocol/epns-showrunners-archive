import { Container } from 'typedi';
import config from '../../../config';
import epnsNotify from '../../../helpers/epnsNotifyHelper';
import { EventDispatcher, EventDispatcherInterface } from '../../../decorators/eventDispatcher';

let epns;

async function initializeEPNS(logger, eventDispatcher) {
  try {
    // console.log("tick");

    epns = epnsNotify.getInteractableContracts(
      config.web3RopstenNetwork,                                      // Network for which the interactable contract is req
      {                                                               // API Keys
        etherscanAPI: config.etherscanAPI,
        infuraAPI: config.infuraAPI,
        alchemyAPI: config.alchemyAPI
      },
      null,                                     // Private Key of the Wallet sending Notification
      config.deployedContract,                                        // The contract address which is going to be used
      config.deployedContractABI                                      // The contract abi which is going to be useds
    );

    // EXAMPLE
    epns.provider.on('block', (blockNumber) => {
      logger.info(`🐣 New block mined! -- ${blockNumber}`);
      eventDispatcher.dispatch("newBlockMined", blockNumber)
    })
  } catch (error) {
    deleteEPNSInstance();
    initializeEPNS(logger, eventDispatcher)
  }
}

async function deleteEPNSInstance() {
  if (epns) {
    // console.log("b:", epns.provider.listenerCount("block"))
    await epns.provider.removeAllListeners("block");
    // console.log("c:", epns.provider.listenerCount("block"))

    delete epns.provider;
    delete epns.contract;
    delete epns.signingContract;

    epns = null
  }
}

export default async (app: Router) => {
  const logger = Container.get('logger');
  const eventDispatcher = Container.get(EventDispatcherInterface);
  await initializeEPNS(logger, eventDispatcher)
  //
  // const thirtyMins = 30 * 60 * 1000; // Thirty mins
  // setInterval(async function(){
  //   await deleteEPNSInstance();
  //   await initializeEPNS(logger, eventDispatcher)
  // }, thirtyMins);
}
