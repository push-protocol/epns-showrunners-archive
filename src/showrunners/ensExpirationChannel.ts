// @name: ENS Expiry Channel
// @version: 1.0.1
// @recent_changes: ENS Expiry Payload Fix

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import events from '../subscribers/events';

import { ethers } from 'ethers';

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
import epnsNotify from '../helpers/epnsNotifyHelper';
import { database } from 'firebase-admin';
import { resolve } from 'dns';
const gr = require('graphql-request')
const { request, gql } = gr;

const NETWORK_TO_MONITOR = config.web3RopstenNetwork;
const TRIGGER_THRESHOLD_SECS = 60 * 60 * 24 * 7; // 7 Days

@Service()
export default class EnsExpirationChannel {
  constructor(
    @Inject('logger') private logger,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {}

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    logger.debug('Checking for expired address... ');

    return await new Promise((resolve, reject) => {
      // Preparing to get all subscribers of the channel
      const ensChannelAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['ensDomainExpiryPrivateKey_1']);

       // Call Helper function to get interactableContracts
      const epns = this.getEPNSInteractableContract(config.web3RopstenNetwork);
      const ens = this.getENSInteractableContract(NETWORK_TO_MONITOR);


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
                  this.checkENSDomainExpiry(NETWORK_TO_MONITOR, ens, userAddress, TRIGGER_THRESHOLD_SECS, simulate)
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
                        wallet,        // Recipient to which the payload should be sent
                        parseInt(payloadType),                                    // Notification Type
                        storageType,                                                              // Notificattion Storage Type
                        ipfshash,                                                       // Notification Storage Pointer
                        txConfirmWait,                                                              // Should wait for transaction confirmation
                        logger,                                                         // Logger instance (or console.log) to pass
                        simulate                                                        // Passing true will not allow sending actual notification
                      ).then ((tx) => {
                        logger.info("Transaction mined: %o | Notification Sent", tx.hash);
                        resolve(tx);
                      })
                      .catch (err => {
                        logger.error("🔥Error --> sendNotification(): %o", err);
                        reject(err);
                      });
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

  public getENSInteractableContract(web3network) {
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        null,                                       // Private Key of the Wallet sending Notification
        config.ensDeployedContract,                                             // The contract address which is going to be used
        config.ensDeployedContractABI                                           // The contract abi which is going to be useds
      );
  }

  public getEPNSInteractableContract(web3network) {
    // Get Contract
    return epnsNotify.getInteractableContracts(
        web3network,                                              // Network for which the interactable contract is req
        {                                                                       // API Keys
          etherscanAPI: config.etherscanAPI,
          infuraAPI: config.infuraAPI,
          alchemyAPI: config.alchemyAPI
        },
        channelWalletsInfo.walletsKV['ensDomainExpiryPrivateKey_1'],            // Private Key of the Wallet sending Notification
        config.deployedContract,                                                // The contract address which is going to be used
        config.deployedContractABI                                              // The contract abi which is going to be useds
      );
  }

  // To Check for domain expiry
  public async checkENSDomainExpiry(networkToMonitor, ens, userAddress, triggerThresholdInSecs, simulate) {
    const logger = this.logger;

    if(!ens){
      logger.debug("ENS Interactable Contract not set... mostly coming from routes, setting contract for --> %s", networkToMonitor);
      ens = this.getENSInteractableContract(networkToMonitor)
    }

    return new Promise(async (resolve) => {

      const ensRoute = "subgraphs/name/dev-cnote/ens"
      const ENS_URL = `${config.ensEndpoint}${ensRoute}`;
      const address = userAddress.toLowerCase();

      let data = await this.getData(address,ENS_URL)

      if(data.registrations.length == 0){
        resolve({
          success: false,
          err: `ENS name doesn't exist for address: ${userAddress}, skipping...`
        });
      }
      else{
        let loop = data.registrations.length;
        const result =  await this.getDomain(loop,data,address,ENS_URL,ens,triggerThresholdInSecs,networkToMonitor,simulate)

        if(result.flag){
        // logic loop, it has 7 days or less to expire but not expired
        this.getENSDomainExpiryPayload(result.ensAddressName, result.dateDiff)
          .then(payload => {
            epnsNotify.uploadToIPFS(payload, logger, simulate)
              .then(async (ipfshash) => {
                // Sign the transaction and send it to chain
                const walletAddress = ethers.utils.computeAddress(channelWalletsInfo.walletsKV['ensDomainExpiryPrivateKey_1']);
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
      }

    });
  }

  public async getDomain(loop,data,address,ENS_URL,ens,triggerThresholdInSecs,networkToMonitor,simulate) {
    const logger = this.logger;

    if(!ens){
      logger.debug("ENS Interactable Contract not set... mostly coming from routes, setting contract for --> %s", networkToMonitor);
      ens = this.getENSInteractableContract(networkToMonitor)
    }

    if(!data){
      data = await this.getData(address,ENS_URL);
      loop = data.registrations.length
    }

    return new Promise(async (resolve) => {

      let dates:number[] = [];
      let ensName:string[] = [];
      let flag:boolean;

      for(let i = 0; i < loop; i++){
        let hashedName = data.registrations[i].domain.labelhash;

        const GET_LABEL_NAME = gql`
        query{
          domains(where:{labelhash:"${hashedName}"}){
            labelName
          }
        }`

        const dataInfo = await request(ENS_URL, GET_LABEL_NAME)

        let ensAddressName = dataInfo.domains[0].labelName;

        const expiredDate = await ens.contract.nameExpires(hashedName)

        // convert the date returned
        let expiryDate = ethers.utils.formatUnits(expiredDate, 0).split('.')[0];

        // get current date
        let currentDate = (new Date().getTime() - new Date().getMilliseconds()) / 1000;

        // get date difference
        let dateDiff = expiryDate - currentDate; // some seconds

        // Log it
        logger.debug(
          "Domain %s exists with Expiry Date: %d | Date Diff: %d | Checking against: %d | %o",
          ensAddressName,
          expiryDate,
          dateDiff,
          triggerThresholdInSecs,
          (dateDiff < triggerThresholdInSecs) ? "Near Expiry! Alert User..." : "Long time to expire, don't alert"
        );

        // if difference exceeds the date, then it's already expired
        if (dateDiff > 0 && dateDiff < triggerThresholdInSecs) {
          dates.push(dateDiff);
          ensName.push(ensAddressName);
          flag = true;
        }
      }

      resolve({
        dateDiff:dates,
        ensAddressName:ensName,
        flag:flag
      })

    })
  }

  private async getData(address,ENS_URL){
    let data;
    const GET_LABEL_NAME = gql`{
      registrations(where:{registrant:"${address}"})
      {
        id
        domain{
          id
          labelhash
        }
      }
    }`

   data = await request(ENS_URL, GET_LABEL_NAME)
   return(data)
  }

	public async getENSDomainExpiryPayload(ensAddressName, dateDiff) {
			const logger = this.logger;
      logger.debug('Preparing payload...');

      let loop = dateDiff.length;
      let numOfDays = [];

      for(let i = 0; i < loop; i++){
        const calNumOfDays = Math.floor(dateDiff[i] / (60 * 60 * 24));
        numOfDays.push(calNumOfDays);
      }

      return await new Promise(async (resolve, reject) => {
        const title = "ENS Domain Expiry Alert!";
        const payloadTitle = "ENS Domain Expiry Alert!";
        let message;
        let payloadMsg;

        if(loop > 1){
          message = "your domains:" + ensAddressName + " are set to expire in " + numOfDays + " days";
          payloadMsg = "[d subscriber your domains:" + ensAddressName + "] are set to expire in " + numOfDays + " days, tap me to renew it! [timestamp: " + Math.floor(new Date() / 1000) + "]";
        }
        else{
          message = ensAddressName + " is set to expire in " + numOfDays + " days";
          payloadMsg = "[d:" + ensAddressName + "] is set to expire in " + numOfDays + " days, tap me to renew it! [timestamp: " + Math.floor(new Date() / 1000) + "]";
        }

        const payload = await epnsNotify.preparePayload(
          null,                                                               // Recipient Address | Useful for encryption
          3,                                                                  // Type of Notification
          title,                                                              // Title of Notification
          message,                                                            // Message of Notification
          payloadTitle,                                                       // Internal Title
          payloadMsg,                                                         // Internal Message
          "https://app.ens.domains/name/" + ensAddressName[0],                                                               // Internal Call to Action Link
          null,                                                               // internal img of youtube link
        );

        logger.debug('Payload Prepared: %o', payload);

        resolve(payload);
    });
  }
}
