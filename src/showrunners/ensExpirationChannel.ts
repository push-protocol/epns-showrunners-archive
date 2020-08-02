import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import Web3 from 'web3';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');

@Service()
export default class EnsExpirationChannel {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}
  
  // To form and write to smart contract
  public async sendMessageToContract() {

    const logger = this.logger;

    logger.debug('Checking for expired address... ');

    return await new Promise((resolve, reject) => {
      this.getNewMessage()
        .then(payload => {

          const jsonisedPayload = JSON.stringify(payload);
          
          const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
          ipfs.add(jsonisedPayload)
            .then(ipfshash => {
              
              
              const web3 = new Web3(config.infuraId);

             
              const provider = new ethers.providers.InfuraProvider('ropsten');
              
              let wallet = new ethers.Wallet(config.ensTickerPrivateKey, provider);
              
              let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
              
              let ensContract = new ethers.Contract(config.ensDeployedContract, config.ensDeployedContractABI, provider);
              
              let epnsContractWithSigner = epnsContract.connect(wallet);

              let ensContractWithSigner = ensContract.connect(wallet);
              
              const sha3 = require("web3-utils").sha3;
              
              const filter = epnsContractWithSigner.filters.Subscribe("0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54")
              
              let fromBlock = 0
              
              epnsContract.queryFilter(filter, fromBlock)
                .then(eventLog => {

                  let whiteList = [  '0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54'];
                	let addressCount;
                  let address;
                  let sevenDays = 604800;
                
                	for (let i = 0; i < eventLog.length ;i++) {
                    	
                      let usersAddress = eventLog[0].args.user;

                      provider.lookupAddress(usersAddress)
                      .then(ensAddressName => {

                        let addressName = ensAddressName;

                        let removeEth = addressName.split('.')[0];

                        let hashedName =  sha3(removeEth);

                        ensContractWithSigner.nameExpires(hashedName)
                          .then(expiredDate => {

                            let date = ethers.utils.formatUnits(expiredDate,0).split('.')[0];
                            
                            let currentDate = (new Date().getTime()- new Date().getMilliseconds())/1000;
                            let ipfshashh = 'QmQhzsCoqShH8zEbQtSkh73NUxWYm2L3erx2XKcQfWbjuB';
                           
                              if(date - currentDate > 26720495){  
                              //28720495 is miliseconds time gotten after deduction of currentDate from date
                          //if(date < sevenDays ){     
                            if(whiteList.includes(eventLog[i].args.user)){
                            
                            }
                            else if (!whiteList.includes(eventLog[i].args.user)){
                            	let txPromise = epnsContractWithSigner.sendMessage(eventLog[i].args.user, parseInt(payload.data.type), ipfshash, 1);
                              
                              txPromise
                                .then(function(tx) {
                                  logger.info("Transaction sent: %o", tx);
                                  whiteList.push(eventLog[i].args.user)
                                  resolve({ success: 1, data: tx });
                                })
                                  .catch(err => {
                                    reject("Unable to complete transaction, error: %o", err)
                                    throw err;
                                  });}}else{console.log(currentDate, date);}
                              

                          //if(date - currentDate > 28720495){ for testing where 
                              //28720495 is miliseconds time gotten after deduction of currentDate from date 
                          if(date > sevenDays ){
                                	address = usersAddress;
		                            for (let r = 0; r < whiteList.length; r++) {
		                    		if(whiteList[r] === address){
                              addressCount = r;
		                    	 } 
		                    	}
		                    }

		                    if(whiteList[addressCount] === eventLog[i].args.user){
                            	whiteList.splice(addressCount, 1);}	
                            
                          })
                      })
                    }
                })
            })
              .catch(err => {
                reject("Unable to obtain ipfshash, error: %o", err)
                throw err;
              });
        })
          .catch(err => {
            logger.error(err);
            reject("Unable to proceed message", err);
            throw err;
          });
    });
  }
 
	public async getNewMessage() {
			const logger = this.logger;
			logger.debug('Preparing message...');

         return await new Promise((resolve, reject) => {
 		      const title = "ENS Name Expiration";
          const message = "7 days to expiration";

          const payloadTitle = "Your ENS name is about to expire";
          const payloadMsg = "Dear user, your ENS will be expiring in 7 days kindly click on this write up for a guide on how to renew your ENS name";

          const payload = {
            "notification": {
              "title": title,
              "body": message
            },
            "data": {
              "type": "1", // Group Message
              "secret": "",
              "asub": payloadTitle,
              "amsg": payloadMsg,
              "acta": "https://medium.com/the-ethereum-name-service/the-great-renewal-its-time-to-renew-your-eth-names-or-else-lose-them-afccea4852cb",
              "aimg": ""
            }
          };

          resolve(payload);
        })
 }
}