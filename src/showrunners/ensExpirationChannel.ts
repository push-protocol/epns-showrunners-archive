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
      // Preparing to get all subscribers of the channel
      const web3 = new Web3(config.infuraId);
      const provider = new ethers.providers.InfuraProvider('ropsten');

      let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);
      let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
      let ensContract = new ethers.Contract(config.ensDeployedContract, config.ensDeployedContractABI, provider);

      let epnsContractWithSigner = epnsContract.connect(wallet);
      let ensContractWithSigner = ensContract.connect(wallet);

      const sha3 = require("web3-utils").sha3;


      const filter = epnsContractWithSigner.filters.Subscribe("0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54")

      let fromBlock = 0

      // Function to get all the addresses in the channel
      epnsContractWithSigner.queryFilter(filter, fromBlock)
        .then(eventLog => {
          // Log the event
          logger.debug("Event log returned %o", eventLog);

          // Loop through all addresses in the channel and decide who to send notification
          for (let i = 0; i < eventLog.length ;i++) {
            // Get user address
            let usersAddress = eventLog[0].args.user;
            this.checkENSDomainExpiry(usersAddress, provider, ensContractWithSigner, sha3);
          }

          resolve("ENS Domain Expiry in progress");
        })
        .catch(err => {
          logger.error("Error occurred while looking at event log: %o", err);
        });
    });
  }

  // To Check for domain expiry
  public async checkENSDomainExpiry(usersAddress, provider, ensContractWithSigner, sha3) {
    const logger = this.logger;

    // Lookup the address
    provider.lookupAddress(usersAddress)
      .then(ensAddressName => {
        let addressName = ensAddressName;
        let removeEth = addressName.split('.')[0];
        
        
        let hashedName = sha3(removeEth);

        ensContractWithSigner.nameExpires(hashedName)
          .then(expiredDate => {
              // convert the date returned
              let date = ethers.utils.formatUnits(expiredDate,0).split('.')[0];

              // get current date
              let currentDate = (new Date().getTime()- new Date().getMilliseconds())/1000;

              // get date difference
              let dateDiff = date - currentDate; // some seconds

              // if difference exceeds the date, then it's already expired, if not then it's in 7 days
              if (dateDiff > 0 && dateDiff < 60 * 60 * 24 * 7) {

                // logic loop, it has 7 days or less to expire but not expired
                this.getENSDomainExpiryPayload(dateDiff)
                  .then(payload => {
                    const jsonisedPayload = JSON.stringify(payload);

                    // handle payloads, etc
                    const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
                    ipfs.add(jsonisedPayload)
                      .then(ipfshash => {
                        // Sign the transaction and send it to chain
                        const walletAddress = ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey);

                        logger.info("Payload prepared: %o, ipfs hash generated: %o, sending data to on chain from address %s...", payload, ipfshash, walletAddress);

                        let provider = new ethers.providers.InfuraProvider('ropsten');
                        let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);

                        // define contract
                        let contract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
                        // logger.info("Contract defined at address: %s with object: %o", ethers.utils.computeAddress(config.btcTickerPrivateKey), contract);

                        // connect as a signer of the non-constant methode
                        let contractWithSigner = contract.connect(wallet);
                        let txPromise = contractWithSigner.sendMessage(usersAddress, parseInt(payload.data.type), ipfshash, 3);

                        txPromise
                          .then(function(tx) {
                            logger.info("Transaction sent: %o", tx);
                            return resolve({ success: 1, data: tx });
                          })
                          .catch(err => {
                            reject("Unable to complete transaction, error: %o", err)
                            throw err;
                          });
                      })
                      .catch(err => {
                        reject("Unable to obtain ipfshash, error: %o", err)
                        throw err;
                      });
                  })
                  .catch(err => {
                    logger.error(err);
                    reject("Unable to proceed with cmc, error: %o", err);
                    throw err;
                  });
              }
          })
          .catch(err => {
            logger.error("Error occurred on Name Expiry for ENS Address: %s: %o", ensAddressName, err);
          })
      })
      .catch(err => {
        logger.error("Error occurred in lookup of address[%s]: %o", usersAddress, err);
      });
  }

	public async getENSDomainExpiryPayload(dateDiff) {
			const logger = this.logger;
			logger.debug('Preparing payload...');

      const numOfDays = floor(dateDiff / (60 * 60 * 24));

      return await new Promise((resolve, reject) => {
        const title = "ENS Name Expiration";
        const message = numOfDays + " days to expiration";

        const payloadTitle = "Your ENS name is about to expire";
        const payloadMsg = "Dear user, your ENS will be expiring in " + numOfDays + " days, kindly click on this write up for a guide on how to renew your ENS name";

        const payload = {
          "notification": {
            "title": title,
            "body": message
          },
          "data": {
            "type": "3",
            "secret": "",
            "asub": payloadTitle,
            "amsg": payloadMsg,
            "acta": "https://medium.com/the-ethereum-name-service/the-great-renewal-its-time-to-renew-your-eth-names-or-else-lose-them-afccea4852cb",
            "aimg": ""
          }
        };

        resolve(payload);
    });
  }
}
