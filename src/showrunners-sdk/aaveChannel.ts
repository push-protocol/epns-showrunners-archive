// @name: Aave Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { ethers, logger } from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '../sdk'
// import epnsHelper, {InfuraSettings, NetWorkSettings} from '@epnsproject/backend-sdk'
const channelKey = channelWalletsInfo.walletsKV['aavePrivateKey_1']

const HEALTH_FACTOR_THRESHOLD = 1.6;
const CUSTOMIZABLE_SETTINGS = {
  'precision': 3,
}

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
const sdk = new epnsHelper(config.web3PolygonMainnetRPC, channelKey, settings, epnsSettings)

@Service()
export default class AaveChannel {
  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const users = await sdk.getSubscribedUsers()
    const aave = await sdk.getContract(config.aaveLendingPoolDeployedContractPolygonMainnet, config.aaveLendingPoolDeployedContractABI)
    const promises = users.map(user => this.checkHealthFactor(aave, user, simulate))
    await Promise.all(promises)
  }

  public async checkHealthFactor(aave, userAddress, simulate) {
      const userData = await aave.contract.getUserAccountData(userAddress)
      let  healthFactor = ethers.utils.formatEther(userData.healthFactor)
      if(Number(healthFactor) <= HEALTH_FACTOR_THRESHOLD){
        const precision = CUSTOMIZABLE_SETTINGS.precision;
        const newHealthFactor = parseFloat(healthFactor).toFixed(precision);
        const title = "Aave Liquidity Alert!";
        const message =  userAddress + " your account has healthFactor "+ newHealthFactor + ". Maintain it above 1 to avoid liquidation.";
        const payloadTitle = "Aave Liquidity Alert!";
        const payloadMsg = `Dear [d:${userAddress}] your account has healthFactor ${newHealthFactor} . Maintain it above 1 to avoid liquidation.[timestamp: ${Math.floor(new Date() / 1000)}]`;
        const tx = await sdk.sendNotification(userAddress, title, message, payloadTitle, payloadMsg, simulate)
        logger.info(tx)
        return {
          success: true
        }
      }
      else{
        return {
          success: false
        }
      }
  }
}

