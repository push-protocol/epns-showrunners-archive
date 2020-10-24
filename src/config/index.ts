import dotenv from 'dotenv';

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process

  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
  /**
   * Your favorite port
   */
  environment: process.env.NODE_ENV,

  /**
   * Your favorite port
   */
  port: parseInt((process.env.PORT || '3000'), 10),

  /**
   * Your favorite port
   */
  runningOnMachine: process.env.RUNNING_ON_MACHINE,

  /**
   * Used by winston logger
   */
  logs: {
    level: process.env.LOG_LEVEL || 'silly',
  },

  /**
   * Trusted URLs, used as middleware for some and for future
   */
  trusterURLs: JSON.parse(process.env.TRUSTED_URLS),

  /**
   * The database config
   */
  dbhost: process.env.DB_HOST,
  dbname: process.env.DB_NAME,
  dbuser: process.env.DB_USER,
  dbpass: process.env.DB_PASS,
  mongodb: process.env.MONGO_URI,
  redisURL: process.env.REDIS_URL,

  /**
   * File system config
   */
  fsServerURL: process.env.NODE_ENV == 'development' ? process.env.FS_SERVER_DEV : process.env.FS_SERVER_PROD,
  staticServePath: process.env.SERVE_STATIC_FILES,
  staticCachePath: __dirname + '/../../' + process.env.SERVE_STATIC_FILES + '/' + process.env.SERVE_CACHE_FILES + '/',
  staticAppPath: __dirname + '/../../',

  /**
   * Server related config
   */
  maxDefaultAttempts: process.env.DEFAULT_MAX_ATTEMPTS,

  /**
   * Web3 Related
   */
  web3provider: process.env.NODE_ENV == 'development' ? process.env.DEV_WEB3_PROVIDER : process.env.PROD_WEB3_PROVIDER,
  web3network: process.env.NODE_ENV == 'development' ? process.env.DEV_WEB3_NETWORK : process.env.PROD_WEB3_NETWORK,
  web3socket: process.env.NODE_ENV == 'development' ? process.env.DEV_WEB3_SOCKET : process.env.PROD_WEB3_SOCKET,

  /**
   * EPNS Related
   */
  deployedContract: process.env.EPNS_DEPLOYED_CONTRACT,
  deployedContractABI: require('./epns_contract.json'),

  /**
   * ENS Related
   */
  ensDeployedContract: process.env.ENS_DEPLOYED_CONTRACT,
  ensDeployedContractABI: require('./ens_contract.json'),

    /**
   * COMPOUND Related
   */
  compComptrollerDeployedContract: process.env.COMPOUND_COMPTROLLER_DEPLOYED_CONTRACT,
  compComptrollerDeployedContractABI: require('./comp_comptroller.json'),

  cDaiDeployedContract:process.env.CDAI,
  cDaiDeployedContractABI: require('./cDai.json'),

  cBatDeployedContract:process.env.CBAT,
  cBatDeployedContractABI: require('./cBat.json'),

  cEthDeployedContract:process.env.CETH,
  cEthDeployedContractABI: require('./cEth.json'),

  cRepDeployedContract:process.env.CREP,
  cRepDeployedContractABI: require('./cRep.json'),

  cSaiDeployedContract:process.env.CSAI,
  cSaiDeployedContractABI: require('./cSai.json'),

  cUniDeployedContract:process.env.CUNI,
  cUniDeployedContractABI: require('./cUni.json'),

  cUsdcDeployedContract:process.env.CUSDC,
  cUsdcDeployedContractABI: require('./cUsdc.json'),

  cUsdtDeployedContract:process.env.CUSDT,
  cUsdtDeployedContractABI: require('./cUsdt.json'),

  cWbtcDeployedContract:process.env.CWBTC,
  cWbtcDeployedContractABI: require('./cWbtc.json'),

  cZrxDeployedContract:process.env.CZRX,
  cZrxDeployedContractABI: require('./cZrx.json'),

  priceOracleDeployedContract:process.env.PRICE,
  priceOracleDeployedContractABI: require('./priceOracle.json'),

  /**
   * IPFS related
   */
  ipfsMaxAttempts: process.env.IPFS_MAX_ATTEMPTS,
  ipfsGateway: process.env.IPFS_GATEWAY,

  /**
   * API configs
   */
  api: {
    prefix: '/apis',
  },

  /**
   * Showrunners config, always at last since this is a seperate module
   */
  cmcAPIKey: process.env.CMC_API_KEY,
  cmcEndpoint: process.env.CMC_ENDPOINT,

  gasAPIKey: process.env.GAS_API_KEY,
  gasEndpoint: process.env.GAS_ENDPOINT,

  cmcSandboxAPIKey: process.env.CMS_SANDBOX_API_KEY,
  cmcSandboxEndpoint: process.env.CMC_SANDBOX_ENDPOINT,

  btcTickerPrivateKey: process.env.BTC_TICKER_PRIVATE_KEY,
  ethTickerPrivateKey: process.env.ETH_TICKER_PRIVATE_KEY,
  ensDomainExpiryPrivateKey: process.env.ENS_DOMAIN_EXPIRY_PRIVATE_KEY,
  compComptrollerPrivateKey: process.env.COMP_COMPTROLLER_PRIVATE_KEY,
  ethGasStationPrivateKey: process.env.ETH_GAS_STATION_PRIVATE_KEY,

  infuraId: process.env.ID,
};
