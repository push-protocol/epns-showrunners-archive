// @name: Wallet Tracker Cnannel
// @version: 1.0

import { Service, Inject, Container } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import PQueue from 'p-queue';
import { ethers, logger } from 'ethers';
import epnsHelper, {InfuraSettings, NetWorkSettings, EPNSSettings} from '../sdk'
// import epnsHelper, {InfuraSettings, NetWorkSettings} from '@epnsproject/backend-sdk'
const queue = new PQueue();
let retries = 0
const channelKey = channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1']
const NETWORK_TO_MONITOR = config.web3RopstenNetwork;

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
const sdk = new epnsHelper(NETWORK_TO_MONITOR, channelKey, settings, epnsSettings)

const SUPPORTED_TOKENS = {
  'ETH':{
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      ticker: 'ETH',
      decimals: 18
  }
}

const CUSTOMIZABLE_SETTINGS = {
  'precision': 3,
  'ticker': 5,
}

@Service()
export default class WalletTrackerChannel {
  running: any;
  UserTokenModel: any;
  constructor() {
    let running = false;
    // this.running =  false;
  }

  public async getSupportedERC20sArray(web3network) {
    let erc20s = [];

    for (const ticker in SUPPORTED_TOKENS) {
      await sdk.getContract(SUPPORTED_TOKENS[ticker].address, config.erc20DeployedContractABI )
      .then(res => {
        erc20s[`${ticker}`] = res

      })
      // erc20s[`${ticker}`] = await sdk.getContract(SUPPORTED_TOKENS[ticker].address, config.erc20DeployedContractABI )
    }

    return erc20s;
  }

  public async sendMessageToContract(simulate) {

    // Ignore call if this is already running
    if (this.running) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Wallet Tracker instance is already running! Skipping...`);
      return;
    }
    this.running = true;

    const users = await sdk.getSubscribedUsers()

    // const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
    const interactableERC20s = await this.getSupportedERC20sArray(NETWORK_TO_MONITOR);
    const epns = sdk.advanced.getInteractableContracts(config.web3RopstenNetwork, settings, channelKey, config.deployedContract, config.deployedContractABI);

    users.forEach(async user => {
      await queue.add(() => this.processAndSendNotification(epns, user, NETWORK_TO_MONITOR, simulate, interactableERC20s));
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Added processAndSendNotification for user:%o `, user)
    });
    
    await queue.onIdle();
    this.running = false;
    logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Done for all`);
  }

  public async processAndSendNotification(epns, user, NETWORK_TO_MONITOR, simulate, interactableERC20s) {
    try{
      const object = await this.checkWalletMovement(user, NETWORK_TO_MONITOR, simulate, interactableERC20s);
      if (object.success) {
        const user = object.user
        const title = "Wallet Tracker Alert!";
        const message = "Crypto Movement from your wallet detected!";
        const payloadTitle = "Crypto Movement Alert!";
        const payloadMsg = this.prettyTokenBalances(object.changedTokens);
        const tx = await sdk.sendNotification(user, title, message, payloadTitle, payloadMsg, simulate)
        logger.info(tx);
        logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Transaction successful: %o | Notification Sent`, tx.hash);
        logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- 🙌 Wallet Tracker Channel Logic Completed for user : %o`, user);
      }
      else{
        logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- No wallet movement: %o`, object)
      }
    } catch (error) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Sending notifications failed to user: %o | error: %o`, user, error)
      if (retries <=5 ) {
        retries++
        await queue.add(() => this.processAndSendNotification(epns, user, NETWORK_TO_MONITOR, simulate, interactableERC20s));
      } else {
        retries = 0
      }
    }
  }

  public async checkWalletMovement(user, networkToMonitor, simulate, interactableERC20s) {

    // check and return if the wallet is the channel owner
    if (this.isChannelOwner(user)) {
      return {
        success: false,
        data: "Channel Owner User: " + user
      };
    }

    // check and recreate provider mostly for routes
    if (!interactableERC20s) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Mostly coming from routes... rebuilding interactable erc20s`);
      //need token address
      interactableERC20s = this.getSupportedERC20sArray(networkToMonitor);
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Rebuilt interactable erc20s --> %o`, interactableERC20s);
    }

    let changedTokens = [];

    // let promises = SUPPORTED_TOKENS.map(token => {
    let promises = [];
    for (const ticker in SUPPORTED_TOKENS) {
      promises.push(this.checkTokenMovement(user, networkToMonitor, ticker, interactableERC20s, simulate))
    }

    const results = await Promise.all(promises)
    changedTokens = results.filter(token => token.resultToken.changed === true)
    // logger.info('changedTokens: %o', changedTokens)
    if(changedTokens.length>0){
      return {
        success: true,
        user,
        changedTokens
      }
    }
    else{
      return {
        success: false,
        data: "No token movement for wallet: " + user
      }
    }
  }

  public isChannelOwner(user) {
    if (ethers.utils.computeAddress(channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1']) == user) {
      return true;
    }

    return false;
  }

  public async checkTokenMovement(user, networkToMonitor, ticker, interactableERC20s, simulate) {

    // check and recreate provider mostly for routes
    if (!interactableERC20s) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Mostly coming from routes... rebuilding interactable erc20s`);
      //need token address
      interactableERC20s = this.getSupportedERC20sArray(networkToMonitor);
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Rebuilt interactable erc20s --> %o`, interactableERC20s);
    }

    return new Promise((resolve) => {

    this.getTokenBalance(user, networkToMonitor, ticker, interactableERC20s[ticker], simulate)
    .then((userToken: any) => {

      // logger.info('userToken: %o', userToken)
      this.getTokenBalanceFromDB(user, ticker)
      .then((userTokenArrayFromDB: any) =>{
        // logger.info('userTokenArrayFromDB: %o', userTokenArrayFromDB)
        // logger.info('userTokenArrayFromDB.length: %o', userTokenArrayFromDB.length)
        if(userTokenArrayFromDB.length == 0){
          this.addUserTokenToDB(user, ticker, userToken.balance)
          .then(addedToken =>{
            resolve({
              ticker,
              resultToken: {
                changed: false
              },
              addedToken,
            })
          })
        }
        else{
          let userTokenFromDB
          userTokenArrayFromDB.map(usertoken => {
            return userTokenFromDB = usertoken
          })

          // logger.info('userTokenFromDB: %o', userTokenFromDB)
          let tokenBalanceStr= userToken.balance
          let tokenBalance= Number(tokenBalanceStr.replace(/,/g, ''))
          let tokenBalanceFromDBStr= userTokenFromDB.balance
          let tokenBalanceFromDB= Number(tokenBalanceFromDBStr.replace(/,/g, ''))

          this.compareTokenBalance(tokenBalance, tokenBalanceFromDB)
          .then(resultToken => {
            // logger.info('resultToken: %o', resultToken)
            if(resultToken.changed){
              this.updateUserTokenBalance(user, ticker, resultToken.tokenBalance)
            }
            resolve({
              ticker,
              resultToken
            })
          })
        }
      })
    })
  })
  }

 

  public async getTokenBalance(user, networkToMonitor, ticker, tokenContract, simulate){

    if(!tokenContract){
      tokenContract = sdk.getContract(SUPPORTED_TOKENS[ticker].address, config.erc20DeployedContractABI )
    }

    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride" && simulate.logicOverride.mode) ? simulate.logicOverride.mode : false) : false;
    const simulateApplyToAddr = logicOverride && simulate.logicOverride.hasOwnProperty("applyToAddr") ? simulate.logicOverride.applyToAddr : false;
    const simulateRandomEthBal = logicOverride && (simulateApplyToAddr == user || !simulateApplyToAddr) && simulate.logicOverride.hasOwnProperty("randomEthBalance") ? simulate.logicOverride.randomEthBalance : false;
    const simulateRandomTokenBal = logicOverride && (simulateApplyToAddr == user || !simulateApplyToAddr) && simulate.logicOverride.hasOwnProperty("randomTokenBalance") ? simulate.logicOverride.randomTokenBalance : false;

    return await new Promise((resolve, reject) => {

      if (ticker === 'ETH' ){
        tokenContract.provider.getBalance(user).then(balance => {
          // logger.info("wei balance" + balance);
          let etherBalance;

          if (simulateRandomEthBal) {
            balance = ethers.utils.parseEther((Math.random() * 100001 / 100).toString());
            logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Simulating Random Ether Balance: %s`, ethers.utils.formatEther(balance));
          }

          // balance is a BigNumber (in wei); format is as a string (in ether)
          etherBalance = ethers.utils.formatEther(balance);

          // logger.info("Ether Balance: " + etherBalance);
          let tokenInfo = {
            user,
            ticker,
            balance: etherBalance
          }
          resolve (tokenInfo)
        });
      }

      else{
        let tokenBalance
        tokenContract.contract.balanceOf(user)
        .then(res=> {
          let decimals = SUPPORTED_TOKENS[ticker].decimals

          // Simulate random balance
          if (simulateRandomTokenBal) {
            const random = ethers.BigNumber.from(Math.floor(Math.random() * 10000));
            const randBal = ethers.BigNumber.from(10).pow(SUPPORTED_TOKENS[ticker].decimals - 2);
            res = random.mul(randBal);
            logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Simulating Random Token Balance [%s]: %s`, SUPPORTED_TOKENS[ticker].ticker, res.toString());
          }

          let rawBalance = Number(Number(res));

          tokenBalance = Number(rawBalance/Math.pow(10, decimals)).toLocaleString()
          // logger.info("tokenBalance: " + tokenBalance);
          let tokenInfo = {
            user,
            ticker,
            balance: tokenBalance
          }
          resolve (tokenInfo)
        })
      }
    })
  }

  public async compareTokenBalance(tokenBalance, tokenBalanceFromDB){
    let tokenDifference = tokenBalance-tokenBalanceFromDB
    let resultToken

    if(tokenDifference === 0){
      resultToken = {
        changed: false,
        tokenDifference: tokenDifference,
        tokenBalance,
      }
      return resultToken
    }
    else if (tokenDifference>0){
      resultToken = {
        changed: true,
        increased: true,
        tokenDifference: tokenDifference,
        tokenBalance,
      }
      return resultToken
    }
    else if(tokenDifference<0){
      resultToken = {
        changed: true,
        increased: false,
        tokenDifference: tokenDifference,
        tokenBalance,
      }
      return resultToken
    }
  }

  // Pretty format token balances
  public prettyTokenBalances(changedTokens) {
    const h1 = "[d:Summary & Latest Balance]\n---------";

    let body = '';

    changedTokens.map(token => {
      // convert to four decimal places at max
      const precision = CUSTOMIZABLE_SETTINGS.precision;

      let change = parseFloat(token.resultToken.tokenDifference).toFixed(precision);
      let ticker = token.ticker.trim() + ":";
      const padding = CUSTOMIZABLE_SETTINGS.ticker - ticker.length;
      const spaces = ("               ").slice(-padding);

      if (padding > 0) {
        ticker = ticker + spaces;
      }

      ticker = change >= 0 ? `[➕] [d:${ticker}]` : `[➖] [t:${ticker}]`;
      const newBal = parseFloat(token.resultToken.tokenBalance).toFixed(precision);
      const prevBal = parseFloat(parseFloat(newBal) + parseFloat(newBal)).toFixed(precision);
      change = change >= 0 ? "+" + change : change;
      const sign = change.slice(0, 1);
      const unsignedChange = change.slice(1);

      const formatter = change >= 0 ? "[d:" : "[t:";
      body = `${body}\n${ticker}  [b:${newBal}] ${formatter}${token.ticker}] [[dg:${sign}${unsignedChange} ${token.ticker}]]`;
    })

    const prettyFormat = `${h1}\n${body}[timestamp: ${Math.floor(new Date() / 1000)}]`;
    logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- Pretty Formatted Token Balance \n%o`, prettyFormat);

    return prettyFormat;
  }

  //MONGODB
  public async getTokenBalanceFromDB(userAddress: string, ticker: string): Promise<{}> {
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      let userTokenData
      if (ticker) {
        userTokenData = await this.UserTokenModel.find({ user: userAddress, ticker }).populate("token")
      } else {
        userTokenData = await this.UserTokenModel.find({ user: userAddress }).populate("token")
      }

      // logger.info('userTokenDataDB: %o', userTokenData)
      return userTokenData
    } catch (error) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- getTokenBalanceFromDB Error: %o`, error);
    }
  }

  //MONGODB
  public async addUserTokenToDB(user: string, ticker: string, balance: String): Promise<{}> {
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.create({
        user,
        ticker,
        balance
      })
      // logger.info('addUserTokenToDB: %o', userToken)
      return userToken;
    } catch (error) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- addUserTokenToDB Error: %o`, error);
    }
  }

  //MONGODB
  public async updateUserTokenBalance(user: string, ticker: string, balance: string): Promise<{}> {
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      const userToken = await this.UserTokenModel.findOneAndUpdate(
        { user, ticker },
        { balance },
        { safe: true, new: true }
      );
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- updatedUserToken: %o`, userToken)
      return userToken;
    } catch (error) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- updateUserTokenBalance Error: %o`, error);
    }
  }

  //MONGODB
  public async clearUserTokenDB(): Promise<boolean> {
    this.UserTokenModel = Container.get('UserTokenModel');
    try {
      await this.UserTokenModel.deleteMany({})
      return true;
    } catch (error) {
      logger.info(`[${new Date(Date.now())}]-[Wallet Tracker]- clearUserTokenDB Error: %o`, error);
    }
  }
}



