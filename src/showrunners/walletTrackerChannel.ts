import { Service, Inject, Container } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { truncateSync } from 'fs';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

@Service()
export default class WalletTrackerChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
  }

  public async onSubscription(subscriber){

    const logger = this.logger;

    logger.debug('Getting ethBalance');

    return await new Promise((resolve, reject) => {
        const mainnetProvider = new ethers.providers.InfuraProvider();
        const provider = new ethers.providers.InfuraProvider('ropsten', );
  
        // let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);
  
        let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
        // let epnsContractWithSigner = epnsContract.connect(wallet);

        provider.getBalance(subscriber).then(balance => {

            // balance is a BigNumber (in wei); format is as a sting (in ether)
            var etherString = ethers.utils.formatEther(balance);
        
            console.log("Balance: " + etherString);
            resolve("Got ether balance")
        });
  
        // let tokenContracts = [];

        // for(let i=0; i<tokenContracts.length; i++){

        //     // let tokenContract = new ethers.Contract(config.ensDeployedContract, config.ensDeployedContractABI, mainnetProvider);
    
        //     let fromBlock = 0
        //     let totalSent= 0;
        //     let totalReceived = 0;
        //     let fromTx, toTx;

        //     // tokenContracts[i].queryFilter(startBlock, latestBlock)

        //     // List all token transfers *from* subscriber
        //     fromTx = tokenContracts[i].filters.Transfer(subscriber)

        //     // List all token transfers *to* subscriber
        //     toTx = tokenContracts[i].filters.Transfer(null, subscriber)

        //     console.log(fromTx)
        //     console.log(toTx)

        // }


        // - user-address: {token-address: balance
        //     redis.hget(user-address, token-address)
        //     returns balance
        //     redis.hset(user-address, token-address, balance)


        // localhost:5432/apis/showrunners/gasprice/send_message
    })
  }


  

  


}
