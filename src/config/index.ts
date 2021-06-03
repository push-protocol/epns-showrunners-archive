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
  etherscanAPI: process.env.ETHERSCAN_API,

  infuraAPI: {
    projectID: process.env.INFURA_PROJECT_ID,
    projectSecret: process.env.INFURA_PROJECT_SECRET,
  },

  alchemyAPI: process.env.ALCHEMY_API,

  web3MainnetProvider: process.env.MAINNET_WEB3_PROVIDER,
  web3MainnetNetwork: process.env.MAINNET_WEB3_NETWORK,
  web3MainnetSocket: process.env.MAINNET_WEB3_SOCKET,

  web3RopstenProvider: process.env.ROPSTEN_WEB3_PROVIDER,
  web3RopstenNetwork: process.env.ROPSTEN_WEB3_NETWORK,
  web3RopstenSocket: process.env.ROPSTEN_WEB3_SOCKET,

  web3KovanProvider: process.env.KOVAN_WEB3_PROVIDER,
  web3KovanNetwork: process.env.KOVAN_WEB3_NETWORK,
  web3KovanSocket: process.env.KOVAN_WEB3_SOCKET,

  web3PolygonMainnetProvider: process.env.POLYGON_MAINNET_WEB3_PROVIDER,
  web3PolygonMainnetRPC: process.env.POLYGON_MAINNET_RPC,
  
  web3PolygonMumbaiProvider: process.env.POLYGON_MUMBAI_WEB3_PROVIDER,
  web3PolygonMumbaiRPC: process.env.POLYGON_MUMBAI_RPC,

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

  /**
   * COMPOUND Related
   */
  truefiLenderDeployedContract: process.env.TRUEFI_LENDER_DEPLOYED_CONTRACT,
  truefiLenderDeployedContractABI: require('./truefiLender.json'),

  truefiRatingAgencyDeployedContract: process.env.TRUEFI_RATING_AGENCY_V2_CONTRACT,
  truefiRatingAgencyDeployedContractABI: require('./TrueRatingAgencyV2.json'),

  truefiLoanFactoryDeployedContract: process.env.TRUEFI_LOAN_FACTORY_CONTRACT,
  truefiLoanFactoryDeployedContractABI: require('./truefiLoanFactory.json'),

  truefiLoanTokenDeployedContractABI: require('./truefiLoanToken.json'),
  truefiDueLoanDays: process.env.TRUEFI_DUE_LOAN_DAYS,

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
   * EVEREST Related
   */
  everestDeployedContract: process.env.EVEREST_DEPLOYED_CONTRACT,
  everestDeployedContractABI: require('./everest.json'),

  /**
   * AAVE Related
   */
  aaveLendingPoolDeployedContractKovan: process.env.AAVE_LENDINGPOOL_DEPLOYED_CONTRACT_KOVAN,
  aaveLendingPoolDeployedContractMainnet: process.env.AAVE_LENDINGPOOL_DEPLOYED_CONTRACT_MAINNET,
  aaveLendingPoolDeployedContractPolygonMainnet: process.env.AAVE_LENDINGPOOL_DEPLOYED_CONTRACT_POLYGON_MAINNET,
  aaveLendingPoolDeployedContractPolygonMumbai: process.env.AAVE_LENDINGPOOL_DEPLOYED_CONTRACT_POLYGON_MUMBAI,
  aaveLendingPoolDeployedContractABI: require('./aave_LendingPool.json'),

  /**
   * WALLET TRACKER related
   */
  erc20DeployedContractABI: require('./erc20.json'),

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

  ensEndpoint: process.env.ENS_ENDPOINT,

  cmcSandboxAPIKey: process.env.CMS_SANDBOX_API_KEY,
  cmcSandboxEndpoint: process.env.CMC_SANDBOX_ENDPOINT,

  /**
   * ETH threshold
   */
  ethThreshold: process.env.SHOWRUNNER_WALLET_ETH_THRESHOLD,
  ethMainThreshold: process.env.MASTER_WALLET_ETH_THRESHOLD,
  etherTransferAmount: process.env.ETHER_TRANSFER_AMOUNT,

  /**
   * mail config
   */
  supportMailAddress: process.env.SUPPORT_MAIL_ADDRESS,
  supportMailName: process.env.SUPPORT_MAIL_NAME,
  sourceMailAddress: process.env.SOURCE_MAIL_ADDRESS,
  sourceMailName: process.env.SOURCE_MAIL_NAME,

  /**
   * AWS Config
   */
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY
};
