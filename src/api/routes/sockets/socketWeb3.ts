import { Container } from 'typedi';
import config from '../../../config';
import epnsNotify from '../../../helpers/epnsNotifyHelper';
const events = require('events');
const eventEmitter = new events.EventEmitter();

export default async (app: Router) => {
  const Logger = Container.get('logger');
  const epns = epnsNotify.getInteractableContracts(
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
    console.log('New block mined!', blockNumber);
    eventEmitter.emit('New block mined!', blockNumber);
  })
}
