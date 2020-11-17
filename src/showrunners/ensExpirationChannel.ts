// @name: ENS Expiry Channel
// @version: 1.0.1
// @recent_changes: ENS Expiry Payload Fix

import { Service, Inject } from 'typedi';
import config from '../config';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
const epnsNotify = require('../helpers/epnsNotifyHelper');

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
      const ensChannelAddress = ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey);

      // Call Helper function to get interactableContracts
      const epns = epnsNotify.getInteractableContracts(
        config.web3RopstenNetwork,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        config.ensDomainExpiryPrivateKey,                                       // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );

      const ens = epnsNotify.getInteractableContracts(
        config.web3RopstenNetwork,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        config.ensDomainExpiryPrivateKey,                                       // Private Key of the Wallet sending Notification
        config.ensDeployedContract,                                             // The contract address which is going to be used
        config.ensDeployedContractABI                                           // The contract abi which is going to be useds
      );


      epns.contract.channels(ensChannelAddress)
        .then(async (channelInfo) => {

          // Get Filter
          const filter = epns.contract.filters.Subscribe(ensChannelAddress)
          const startBlock = channelInfo.channelStartBlock.toNumber();

          // Function to get all the addresses in the channel
          epns.contract.queryFilter(filter, startBlock)
            .then(eventLog => {
              // Log the event
              logger.debug("Subscribed Address Found: %o", eventLog.length);

              // Loop through all addresses in the channel and decide who to send notification
              let allTransactions = [];
              eventLog.forEach((log) => {
                // Get user address
                const userAddress = log.args.user;
                allTransactions.push(
                  this.checkENSDomainExpiry(userAddress, ens)
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

                      const storageType = 1; // IPFS Storage Type
                      const txConfirmWait = 1; // Wait for 0 tx confirmation

                      // Send Notification
                      await epnsNotify.sendNotification(
                        epns.signingContract,                                           // Contract connected to signing wallet
                        ethers.utils.computeAddress(config.ensDomainExpiryPrivateKey),        // Recipient to which the payload should be sent
                        parseInt(payloadType),                                    // Notification Type
                        storageType,                                                              // Notificattion Storage Type
                        ipfshash,                                                       // Notification Storage Pointer
                        txConfirmWait,                                                              // Should wait for transaction confirmation
                        logger                                                          // Logger instance (or console.log) to pass
                      ).then ((tx) => {
                        logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                        logger.info("🙌 ETH Ticker Channel Logic Completed!");
                        resolve(tx);
                      })
                      .catch (err => {
                        logger.error("🔥Error --> sendNotification(): %o", err);
                        reject(err);
                      });

                      try {
                        let tx = await epns.signingContract.sendMessage(wallet, payloadType, ipfshash, 1);
                        logger.info("Transaction sent: %o", tx);
                      }
                      catch (err) {
                        logger.error("Unable to complete transaction, error: %o", err);
                      }
                    }
                  }

                  logger.debug("🙌 ENS Domain Expiry logic completed!");
                })
                .catch(err => {
                  logger.error("Error occurred sending transactions: %o", err);
                  reject(err);
                });

              resolve("Processing ENS Domain Expiry logic completed!");
            })
            .catch(err => {
              logger.error("Error occurred while looking at event log: %o", err);
              reject(err);
            });
        })
        .catch(err => {
          logger.error("Error retreiving channel start block: %o", err);
          reject(err);
        });

    });
  }

  // To Check for domain expiry
  public async checkENSDomainExpiry(userAddress, ens) {
    const logger = this.logger;

    return new Promise((resolve) => {
      // Lookup the address

      ens.provider.lookupAddress(userAddress)
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

            ens.contract.nameExpires(hashedName)
              .then(expiredDate => {
                  // convert the date returned
                  let expiryDate = ethers.utils.formatUnits(expiredDate, 0).split('.')[0];

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
                        epnsNotify.uploadToIPFS(payload, logger)
                          .then(async (ipfshash) => {
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
                          .catch (err => {
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

      return await new Promise(async (resolve, reject) => {
        const title = "ENS Domain Expiry Alert!";
        const message = ensAddressName + " is set to expire in " + numOfDays + " days";

        const payloadTitle = "ENS Domain Expiry Alert!";
        const payloadMsg = "[d:" + ensAddressName + "] is set to expire in " + numOfDays + " days, tap me to renew it! [timestamp: " + Math.floor(new Date() / 1000) + "]";

        const payload = await epnsNotify.preparePayload(
          null,                                                               // Recipient Address | Useful for encryption
          3,                                                                  // Type of Notification
          title,                                                              // Title of Notification
          message,                                                            // Message of Notification
          payloadTitle,                                                       // Internal Title
          payloadMsg,                                                         // Internal Message
          null,                                                               // Internal Call to Action Link
          null,                                                               // internal img of youtube link
        );

        logger.debug('Payload Prepared: %o', payload);

        resolve(payload);
    });
  }
}
