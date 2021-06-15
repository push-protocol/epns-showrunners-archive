// @name: ETH Tracker Channel
// @version: 1.0
// @recent_changes: ETH Price Tracker

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
// import PQueue from 'p-queue';
import { ethers, logger } from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '../sdk'
// import epnsHelper, {InfuraSettings, NetWorkSettings} from '@epnsproject/backend-sdk'
const bent = require('bent'); // Download library
const channelKey = channelWalletsInfo.walletsKV['ethTickerPrivateKey_1']

const infuraSettings: InfuraSettings = {
  projectID: config.infuraAPI.projectID,
  projectSecret: config.infuraAPI.projectSecret
}
const settings: NetWorkSettings = {
  alchemy: config.alchemyAPI,
  infura: infuraSettings,
  etherscan: config.etherscanAPI
}
const epnsSettings: EPNSSettings = {
  network: config.web3RopstenNetwork,
  contractAddress: config.deployedContract,
  contractABI: config.deployedContractABI
}
const sdk = new epnsHelper(config.web3MainnetNetwork, channelKey, settings, epnsSettings)

@Service()
export default class EthTickerChannel {
  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    logger.debug(`[${new Date(Date.now())}]-[ETH Ticker]-Getting price of eth... `);
    const getJSON = bent('json');
    const cmcroute = 'v1/cryptocurrency/quotes/latest';
    const pollURL = `${config.cmcEndpoint}${cmcroute}?symbol=ETH&CMC_PRO_API_KEY=${config.cmcAPIKey}`;
    getJSON(pollURL)
    .then(async (response) => {
      if (response.status.error_code) {
        logger.debug("CMC Error: %o", response.status);
      }
      logger.info(`[${new Date(Date.now())}]-[ETH Ticker]-CMC Response: %o`, response);
      // Get data
      const data = response.data["ETH"];
      // construct Title and Message from data
      const price = data.quote.USD.price;
      const formattedPrice = Number(Number(price).toFixed(2)).toLocaleString();
      const hourChange = Number(data.quote.USD.percent_change_1h).toFixed(2);
      const dayChange = Number(data.quote.USD.percent_change_24h).toFixed(2);
      const weekChange = Number(data.quote.USD.percent_change_7d).toFixed(2);
      const title = "ETH at $" + formattedPrice;
      const message = `\nHourly Movement: ${hourChange}%\nDaily Movement: ${dayChange}%\nWeekly Movement: ${weekChange}%`;
      const payloadTitle = `ETH Price Movement`;
      const payloadMsg = `ETH at [d:$${formattedPrice}]\n\nHourly Movement: ${hourChange >= 0 ? "[s:" + hourChange + "%]" : "[t:" + hourChange + "%]"}\nDaily Movement: ${dayChange >= 0 ? "[s:" + dayChange + "%]" : "[t:" + dayChange + "%]"}\nWeekly Movement: ${weekChange >= 0 ? "[s:" + weekChange + "%]" : "[t:" + weekChange + "%]"}[timestamp: ${Math.floor(new Date() / 1000)}]`;
      const tx = await sdk.sendNotification(channelKey, title, message, payloadTitle, payloadMsg, simulate)
      logger.info(tx);
    })
    .catch(err => logger.debug("Unable to reach CMC API, error: %o", err));
  }
}
