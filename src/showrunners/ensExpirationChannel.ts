import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

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
      const mainnetProvider = new ethers.providers.InfuraProvider();
      const provider = new ethers.providers.InfuraProvider('ropsten');

      let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);

      let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
      let epnsContractWithSigner = epnsContract.connect(wallet);

      let ensContract = new ethers.Contract(config.ensDeployedContract, config.ensDeployedContractABI, mainnetProvider);

      const filter = epnsContract.filters.Subscribe("0x4F3BDE9380AEDA90C8A6724AF908bb5a2fac7f54")

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
            allTransactions.push(
              this.checkENSDomainExpiry(userAddress, provider, ensContract)
                .then((result) => {
                  return result;
                })
            );
          });

          // resolve all transactionss
          Promise.all(allTransactions)
            .then(async (results) => {
              logger.debug("All Transactions Loaded: %o", results);

              for (const object of results) {
                if (object.success) {
                  // Send notification
                  const wallet = object.wallet;
                  const ipfshash = object.ipfshash;
                  const payloadType = object.payloadType;

                  logger.info("Wallet: %o | Hash: :%o | Sending Data...", wallet, ipfshash);
                  try {
                    let tx = await epnsContractWithSigner.sendMessage(wallet, payloadType, ipfshash, 1);
                    logger.info("Transaction sent: %o", tx);
                  }
                  catch (err) {
                    logger.error("Unable to complete transaction, error: %o", err);
                  }
                }
              }

              logger.debug("ENS Domain Expiry logic completed!");
            })

          resolve("Processing ENS Domain Expiry logic completed!");
        })
        .catch(err => {
          logger.error("Error occurred while looking at event log: %o", err);
          reject(err);
        });
      });
  }


  // To form and write to smart contract
  public async sendMessageToContractOld() {
    const logger = this.logger;
    logger.debug('Checking for expired address... ');

    return await new Promise((resolve, reject) => {
      // Preparing to get all subscribers of the channel
      const provider = new ethers.providers.InfuraProvider(config.web3provider);

      let wallet = new ethers.Wallet(config.ensDomainExpiryPrivateKey, provider);

      let epnsContract = new ethers.Contract(config.deployedContract, config.deployedContractABI, provider);
      let epnsContractWithSigner = epnsContract.connect(wallet);

      let ensContract = new ethers.Contract(config.ensDeployedContract, config.ensDeployedContractABI, provider);

      const filter = epnsContract.filters.Subscribe(wallet.address)

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
            allTransactions.push(
              this.checkENSDomainExpiry(userAddress, provider, ensContract)
                .then((result) => {
                  return result;
                })
            );
          });

          // resolve all transactionss
          Promise.all(allTransactions)
            .then(async (results) => {
              logger.debug("All Transactions Loaded: %o", results);

              for (const object of results) {
                // Send notification
                const wallet = object.wallet;
                const ipfshash = object.ipfshash;
                const payloadType = object.payloadType;

                logger.info("Wallet: %o | Hash: :%o | Sending Data...", wallet, ipfshash);
                try {
                  let tx = await epnsContractWithSigner.sendMessage(wallet, payloadType, ipfshash, 1);

                  logger.info("Transaction sent: %o", tx);
                }
                catch (err) {
                  logger.error("Unable to complete transaction, error: %o", err);
                }
              }
            })

          resolve("ENS Domain Expiry in progress");
        })
        .catch(err => {
          logger.error("Error occurred while looking at event log: %o", err);

          reject(err);
        });
    });
  }

  // To Check for domain expiry
  public async checkENSDomainExpiry(userAddress, provider, ensContract) {
    const logger = this.logger;

    return new Promise((resolve, reject) => {
      // Lookup the address
      
      provider.lookupAddress(userAddress)
        .then(ensAddressName => {
          let addressName = ensAddressName;
          let removeEth = '';
          if (addressName === null) {
            resolve({
              success: false,
              err: `ENS name doesn't exist for address: ${userAddress}, skipping...`
            });
          }
          else{
            removeEth = addressName.slice(0, -4);
            let hashedName = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(removeEth));
            logger.debug("Checking Domain: %s for Hashed Name: %s", removeEth, hashedName);

            ensContract.nameExpires(hashedName)
              .then(expiredDate => {
                  // convert the date returned
                  let expiryDate = ethers.utils.formatUnits(expiredDate, 0).split('.')[0];
                console.log(expiryDate, addressName)
                  // get current date
                  let currentDate = (new Date().getTime() - new Date().getMilliseconds()) / 1000;

                  // get date difference
                  let dateDiff = expiryDate - currentDate; // some seconds
                  let checkDateDiff = 60 * 60 * 24 * 7; // if not then it's within 7 days

                  // Log it
                  logger.debug(
                    "Domain %s exists with Expiry Date: %d | Date Diff: %d | Checking against: %d | %o",
                    removeEth,
                    expiryDate,
                    dateDiff,
                    checkDateDiff,
                    (dateDiff < checkDateDiff) ? "Near Expiry! Alert User..." : "Long time to expire, don't alert"
                  );

                  // if difference exceeds the date, then it's already expired
                  if (dateDiff > 0 && dateDiff < checkDateDiff) {

                    // logic loop, it has 7 days or less to expire but not expired
                    this.getENSDomainExpiryPayload(ensAddressName, dateDiff)
                      .then(payload => {
                        const jsonisedPayload = JSON.stringify(payload);

                        // handle payloads, etc
                        const ipfs = require("nano-ipfs-store").at("https://ipfs.infura.io:5001");
                        ipfs.add(jsonisedPayload)
                          .then(ipfshash => {
                            // Sign the transaction and send it to chain
                            const walletAddress = ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey);
                            logger.info("ipfs hash generated: %o for Wallet: %s, sending it back...", ipfshash, walletAddress);

                            resolve({
                              success: true,
                              wallet: userAddress,
                              ipfshash: ipfshash,
                              payloadType: parseInt(payload.data.type)
                            });

                          })
                          .catch(err => {
                            logger.error("Unable to obtain ipfshash for wallet: %s, error: %o", userAddress, err)
                            resolve({
                              success: false,
                              err: "Unable to obtain ipfshash for wallet: " + userAddress + " | error: " + err
                            });
                          });
                      })
                      .catch(err => {
                        logger.error("Unable to proceed with ENS Name Expiry Function for wallet: %s, error: %o", userAddress, err);
                        resolve({
                          success: false,
                          err: "Unable to proceed with ENS Name Expiry Function for wallet: " + userAddress + " | error: " + err
                        });
                      });
                  }
                  else {
                    resolve({
                      success: false,
                      err: "Date Expiry condition unmet for wallet: " + userAddress
                    });
                  }
              })
              .catch(err => {
                logger.error("Error occurred on Name Expiry for ENS Address: %s: %o", ensAddressName, err);
                resolve({
                  success: false,
                  err: err
                });
              })
          }
        })
        .catch(err => {
          logger.error("Error occurred in lookup of address[%s]: %o", userAddress, err);
          resolve({
            success: false,
            err: err
          });
        });
      
    });
  }

	public async getENSDomainExpiryPayload(ensAddressName, dateDiff) {
			const logger = this.logger;
			logger.debug('Preparing payload...');

      const numOfDays = Math.floor(dateDiff / (60 * 60 * 24));

      return await new Promise((resolve, reject) => {
        const title = "ENS Domain Expiry Alert!";
        const message = ensAddressName + " is set to expire in " + numOfDays + " days";

        const payloadTitle = "ENS Domain Expiry Alert!";
        const payloadMsg = "[d:" + ensAddressName + "] is set to expire in " + numOfDays + " days, tap me to renew it! [timestamp: " + Math.floor(new Date() / 1000) + "]";

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
            "acta": "https://app.ens.domains/name/" + ensAddressName,
            "aimg": ""
          }
        };

        logger.debug('Payload Prepared: %o', payload);

        resolve(payload);
    });
  }
}
