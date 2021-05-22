// @name: Truefi Channel
// @version: 1.0

import { Service, Inject } from 'typedi';
import config from '../config';
import channelWalletsInfo from '../config/channelWalletsInfo';
import { EventDispatcher, EventDispatcherInterface } from '../decorators/eventDispatcher';
import PQueue from 'p-queue';
import { ethers } from 'ethers';
import epnsHelper from '../helpers/notificationHelper'

const bent = require('bent'); // Download library
const moment = require('moment'); // time library

const db = require('../helpers/dbHelper');
const utils = require('../helpers/utilsHelper');
import epnsNotify from '../helpers/epnsNotifyHelper';
const queue = new PQueue();

// const NETWORK_TO_MONITOR = config.web3MainnetNetwork;
// SET CONSTANTS
const BLOCK_NUMBER = 'truefi_block_number';
const LOANS = 'truefi_loans';

const NOTIFICATION_TYPE = Object.freeze({
  RATE: "rate_changed",
  DUE_LOAN: "loan_due",
  NEW_LOAN: "new_loan",
});

@Service()
export default class AlphaHomoraChannel {
  constructor(
    @Inject('logger') private logger,
    @Inject('cached') private cached,
    @EventDispatcher() private eventDispatcher: EventDispatcherInterface,
  ) {
    this.cached.setCache(BLOCK_NUMBER, 0);
    this.cached.removeCache(LOANS)
  }

  // To form and write to smart contract
  public async sendMessageToContract(simulate) {
    const logger = this.logger;
    const cache = this.cached;
    // Call Helper function to get interactableContracts
    const logicOverride = typeof simulate == 'object' ? (simulate.hasOwnProperty("logicOverride") ? simulate.hasOwnProperty("logicOverride") : false) : false;
    const epnsNetwork = logicOverride && simulate.logicOverride.hasOwnProperty("epnsNetwork") ? simulate.logicOverride.epnsNetwork : config.web3RopstenNetwork;
    // -- End Override logic
    const channelKey = channelWalletsInfo.walletsKV['btcTickerPrivateKey_1']
    const sdk = new epnsHelper(config.web3MainnetNetwork, channelKey)
    const users = sdk.getSubscribedUsers(channelKey)
  }
}