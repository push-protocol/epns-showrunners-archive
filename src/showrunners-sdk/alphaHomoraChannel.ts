// @name: AlphaHomora Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
// import PQueue from 'p-queue';
import { ethers, logger } from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '@epnsproject/backend-sdk'
// const queue = new PQueue();
const channelKey = channelWalletsInfo.walletsKV['alphahomoraPrivateKey_1']

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
export default class AlphaHomoraChannel {
  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const users = await sdk.getSubscribedUsers()
    const AlphaHomoraContract = await sdk.getContract(config.homoraBankDeployedContract, config.homoraBankDeployedContractABI)
    let next_pos = await AlphaHomoraContract.contract.functions.nextPositionId()
    next_pos = Number(next_pos.toString())
    logger.info({next_pos})
    await this.processDebtRatio(users, 100, AlphaHomoraContract.contract, simulate);
  }

  public async processDebtRatio(users: Array<string>, id: number, contract, simulate: boolean | Object) {
    const position = await contract.functions.getPositionInfo(id)
    logger.info({ position: position.owner })
    if (users.includes(position.owner)) {}
    let [borrowCredit, collateralCredit] = await Promise.all([contract.functions.getBorrowETHValue(id), contract.functions.getCollateralETHValue(id)]);
    borrowCredit = Number(ethers.utils.formatEther(borrowCredit[0]))
    collateralCredit = Number(ethers.utils.formatEther(collateralCredit[0]))
    const debtRatio = (borrowCredit / collateralCredit) * 100
    logger.info({ debtRatio })
    if (debtRatio > Number(config.homoraDebtRatioThreshold)) {
      const notificationType = 3;
      const tx = await sdk.sendNotification(
        position.owner,
        'Position Liquidation',
        `Your position of id: ${id} is at ${config.homoraDebtRatioThreshold}% debt ratio and is at risk of liquidation`,
        'Position Liquidation',
        `Your position of id: ${id} is at ${config.homoraDebtRatioThreshold}% debt ratio and is at risk of liquidation. [timestamp: ${Math.floor(new Date() / 1000)}]`,
        notificationType,
        simulate
      )
      logger.info(tx)
    }
  }
}

