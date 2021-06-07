// @name: Aave Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import { ethers } from 'ethers';
import epnsNotify from '../helpers/epnsNotifyHelper';

import hex2ascii from 'hex2ascii'

const NETWORK_TO_MONITOR = config.web3PolygonMainnetRPC;

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@Service()
export default class IpfsPinning {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        channelWalletsInfo.walletsKV['walletTrackerPrivateKey_1'],            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );
  }

  // To form and write to smart contract
  public async pinAllNotif(simulate) {
    const logger = this.logger;
    let networkToMonitor = NETWORK_TO_MONITOR;

    // Check simulate object
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const mode = logicOverride && simulate.logicOverride.mode ? simulate.logicOverride.mode : false;
    const simulateAaveNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("aaveNetwork") ? simulate.logicOverride.aaveNetwork : false;

    if(mode){
      if(simulateAaveNetwork){
        networkToMonitor = simulateAaveNetwork
      }
    }
    logger.debug(`[${new Date(Date.now())}]-[IPFS Pinning]`);
    
    return await new Promise(async(resolve, reject) => {
      const CID = require('cids')

      const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);

      const START_BLOCK = 8976845;
      // const START_BLOCK = 8954120;
      const END_BLOCK = await epns.provider.getBlockNumber();
      const RANGE = 1000000
      let start = START_BLOCK;
      let end = 0;

      // for(let start = START_BLOCK, end=START_BLOCK+RANGE; end<= END_BLOCK; start += RANGE, end+=RANGE){
      for(let start = START_BLOCK, end=START_BLOCK+RANGE; end<= START_BLOCK+RANGE; start += RANGE, end+=RANGE){
        this.queryNotif(epns, start, end)
      }
    })
  }

  public async queryNotif(epns, start, end) {
    console.log("🚀 ~ file: ipfsPinning.ts ~ line 76 ~ IpfsPinning ~ end", end)
    console.log("🚀 ~ file: ipfsPinning.ts ~ line 76 ~ IpfsPinning ~ start", start)
    const logger = this.logger;

    const filter = epns.contract.filters.SendNotification();
      // const startBlock = channelInfo.channelStartBlock.toNumber();

    logger.info("Querying from %o to %o STARTED", start, end)
    await epns.contract.queryFilter(filter, start, end)
      .then(eventLog => {
        console.log("🚀 ~ file: ipfsPinning.ts ~ line 66 ~ IpfsPinning ~ returnawaitnewPromise ~ eventLog", eventLog.length)
        eventLog.forEach(async(log) => {
          // logger.debug(`log: %o`, log.args.identity);
          const identity = hex2ascii(log.args.identity)
          const hash = identity.split('+')[1]
          logger.debug(`hash: %o`, hash);

          const { create } = require('ipfs-http-client')
          const CID = require('cids')
          const fetch = require('node-fetch');
          // const ipfs = create("https://api.thegraph.com/ipfs/api/v0/")
          // const ipfs = create("https://ipfs.infura.io:5001")
          const ipfs = create("/ip4/127.0.0.1/tcp/5001")
          // const ipfs = create("/ip4/0.0.0.0/tcp/8080")

          const url = "https://0.0.0.0:8080/ipfs/" + hash;
          // const url = "https://ipfs.io/ipfs/" + hash;
          await fetch(url)
            .then(result => {result.json()})
            .then(result => {
            console.log("🚀 ~ file: ipfsPinning.ts ~ line 96 ~ IpfsPinning ~ eventLog.forEach ~ result", result)
            const ipfsNotification = result
            })
            .catch(err => {
              logger.error(`[${new Date(Date.now())}]-[IPFS Pinning]-🔥Error --> fetch(): %o`, err);
            })
          

          // for await (const chunk of ipfs.cat(cid)) {
          //   console.info(chunk)
          // }
          // console.log("🚀 ~ file: ipfsPinning.ts ~ line 85 ~ IpfsPinning ~ eventLog.forEach ~ ipfs", ipfs)

          // await ipfs.cat(hash, function(err, res) {
          //   console.log("🚀 ~ file: ipfsPinning.ts ~ line 89 ~ IpfsPinning ~ awaitipfs.cat ~ res", res)
          //   if(err || !res) return console.error("ipfs cat error", err, res);
          //   if(res.readable) {
          //     logger.error('unhandled: cat result is a pipe: %o', res);
          //   } else {
          //     console.log(res)
          //     let notif = res.json()
          //     logger.debug(`notif: %o`, notif);
          //   }
          // })
        });
      })
      logger.info("Querying from %o to %o ENDED", start, end)
  }


}
