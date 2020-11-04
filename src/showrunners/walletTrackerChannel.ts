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

  public async onSubscription(userAddress){

    const cache = this.cached;
    const logger = this.logger;

    logger.debug('Getting ethBalance');

    return await new Promise((resolve, reject) => {
        const mainnetProvider = new ethers.providers.InfuraProvider();
        const provider = new ethers.providers.InfuraProvider('ropsten', );
  
        // let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);
  
        let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
        // let epnsContractWithSigner = epnsContract.connect(wallet);

        provider.getBalance(userAddress).then(balance => {

            // balance is a BigNumber (in wei); format is as a sting (in ether)
            var etherString = ethers.utils.formatEther(balance);
        
            console.log("Balance: " + etherString);
            cache.sethashCache(userAddress, "ETH", balance);
            resolve({
                success: true,
                data: etherString
            })
        });
  
        // let tokenAddresses = [];

        // for(let i=0; i<tokenAddresses.length; i++){

        //     let tokenAddress = tokenAddresses[i]

        //     let tokenContract = new ethers.Contract(tokenAddress, config.erc20DeployedContractABI, provider);
    
        //     let fromBlock = 0
        //     let totalSent= 0;
        //     let totalReceived = 0;
        //     let fromTx, toTx;

        //     // tokenContract.queryFilter(startBlock, latestBlock)

                // List all token transfers *from* userAddress
        //     fromTx = tokenContract.filters.Transfer(userAddress)

        //     // List all token transfers *to* userAddress
        //     toTx = tokenContract.filters.Transfer(null, userAddress)

        //     console.log(fromTx)
        //     console.log(toTx)

        // }

       
    })


  }

  public async tokenMovement(){

    const cache = this.cached;
    const logger = this.logger;

    const mainnetProvider = new ethers.providers.InfuraProvider();
    const provider = new ethers.providers.InfuraProvider('ropsten', );

    // let wallet = new ethers.Wallet(config.walletTrackerPrivateKey, provider);

    let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
    
    // let epnsContractWithSigner = epnsContract.connect(wallet);

    const filter = epnsContract.filters.Subscribe("0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54")

     //get all subscribers of the wallet tracker channel

      let fromBlock = 0

    // Function to get all the addresses in the channel
    epnsContract.queryFilter(filter, fromBlock)
    .then(eventLog => {
      // Log the event
      logger.debug("Event log returned %o", eventLog);

      // Loop through all addresses in the channel and decide who to send notification
      let allTransactions = [];
      eventLog.forEach((log) => {
        // Get user address
        const userAddress = log.args.user;

        // let prevTokenBalance = await this.getTokenBalanceFromDB();

      })
    })
  }


//   public async getTokenBalanceFromDB(userAddress, tokenAddress): Promise<{ average: Number }> {
//     // this.logger.silly('Get gas price');
//     this.GasPriceModel = Container.get('GasPriceModel');
//     try {
//       const gasPrices = await this.GasPriceModel.find()
//         .sort({ _id: -1 })
//         .limit(1);
//       let price = 0;
//       if (gasPrices.length > 0) {
//         price = gasPrices[0].price
//       }
//       return { average: price };
//     } catch (error) {
//       console.log(error);
//     }
//   }


  

  


}
