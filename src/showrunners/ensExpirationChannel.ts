import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';
import { keccak256, toUtf8Bytes } from 'ethers/utils';

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
      const provider = new ethers.providers.InfuraProvider('ropsten');

      let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);

      let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
      let epnsContractWithSigner = epnsContract.connect(wallet);

      let ensContract = new ethers.Contract(config.ensDeployedContract, config.ensDeployedContractABI, provider);

      const filter = epnsContract.filters.Subscribe("0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54")

      let fromBlock = 0

      // Function to get all the addresses in the channel
      epnsContract.queryFilter(filter, fromBlock)
        .then(eventLog => {
          // Log the event
          logger.debug("Event log returned %o", eventLog);

          // Loop through all addresses in the channel and decide who to send notification
          for (let i = 0; i < eventLog.length ;i++) {
            // Get user address
            let usersAddress = eventLog[i].args.user;
            this.checkENSDomainExpiry(usersAddress, provider, ensContract, epnsContractWithSigner);

            // HARSH COMMENT: FIGURE OUT WHEN ALL IPFSHASH HAVE ARRIVED, ALSO STORE THEM IN AN ARRAY WITH USER ADDRESS
            // ONCE DONE, DO TXPROMISE SEQUENTIALLY
          }

          resolve("ENS Domain Expiry in progress");
        })
        .catch(err => {
          logger.error("Error occurred while looking at event log: %o", err);
        });
    });
  }

  // To Check for domain expiry
  public async checkENSDomainExpiry(usersAddress, provider, ensContract, epnsContractWithSigner) {
    const logger = this.logger;

    // Lookup the address
    provider.lookupAddress(usersAddress)
      .then(ensAddressName => {
        let addressName = ensAddressName;
        let removeEth = addressName.slice(0, -4);

        let hashedName = keccak256(toUtf8Bytes(removeEth));
        logger.debug("Checking Domain: %s for Hashed Name: %s", removeEth, hashedName);

        ensContract.nameExpires(hashedName)
          .then(expiredDate => {
              // convert the date returned
              let expiryDate = ethers.utils.formatUnits(expiredDate, 0).split('.')[0];

              // get current date
              let currentDate = (new Date().getTime() - new Date().getMilliseconds()) / 1000;

              // get date difference
              let dateDiff = expiryDate - currentDate; // some seconds
              let checkDateDiff = 60 * 60 * 24 * 330; // if not then it's within 7 days

              // Log it
              logger.debug("Domain %s exists with Expiry Date: %d | Date Diff: %d | Checking against: %d", removeEth, expiryDate, dateDiff, checkDateDiff);

              // if difference exceeds the date, then it's already expired
              if (dateDiff > 0 && dateDiff < checkDateDiff) {

                // logic loop, it has 7 days or less to expire but not expired
                this.getENSDomainExpiryPayload(dateDiff)
                  .then(payload => {
                    const jsonisedPayload = JSON.stringify(payload);

                    // handle payloads, etc
                    const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
                    ipfs.add(jsonisedPayload)
                      .then(ipfshash => {
                        // HARSH: Send IPFS HASH UPWARD
                        // DONT RUN TX HERE

                        // Sign the transaction and send it to chain
                        const walletAddress = ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey);

                        logger.info("Payload prepared: %o, ipfs hash generated: %o, sending data to on chain from address %s...", payload, ipfshash, walletAddress);
                        let txPromise = epnsContractWithSigner.sendMessage(ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey), parseInt(payload.data.type), ipfshash, 1);

                        txPromise
                          .then(function(tx) {
                            logger.info("Transaction sent: %o", tx);
                          })
                          .catch(err => {
                            logger.error("Unable to complete transaction, error: %o", err)
                            throw err;
                          });
                      })
                      .catch(err => {
                        logger.error("Unable to obtain ipfshash, error: %o", err)
                        throw err;
                      });
                  })
                  .catch(err => {
                    logger.error("Unable to proceed with ENS Name Expiry Function, error: %o", err);
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

      const numOfDays = Math.floor(dateDiff / (60 * 60 * 24));

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
            "type": "1",
            "secret": "",
            "asub": payloadTitle,
            "amsg": payloadMsg,
            "acta": "https://medium.com/the-ethereum-name-service/the-great-renewal-its-time-to-renew-your-eth-names-or-else-lose-them-afccea4852cb",
            "aimg": ""
          }
        };

        logger.debug('Payload Prepared: %o', payload);

        resolve(payload);
    });
  }
}