import dotenv from 'dotenv';

const envFound = dotenv.config();
if (envFound.error) {
  // This error should crash whole process

  throw new Error("⚠️  Couldn't find .env file  ⚠️");
}

export default {
    mainWalletPrivateKey: process.env.MASTER_WALLET_PRIVATE_KEY,
    wallets: [
        {
            ensDomainExpiryPrivateKey_1: process.env.ENS_DOMAIN_EXPIRY_PRIVATE_KEY
        },
        {
            btcTickerPrivateKey_1: process.env.BTC_TICKER_PRIVATE_KEY
        },
        {
            ethTickerPrivateKey_1: process.env.ETH_TICKER_PRIVATE_KEY
        },
        {
            ethGasStationPrivateKey_1: process.env.ETH_GAS_STATION_PRIVATE_KEY
        },
        {
            compComptrollerPrivateKey: process.env.COMP_COMPTROLLER_PRIVATE_KEY
        },
        {
            walletTrackerPrivateKey: process.env.WALLET_TRACKER_PRIVATE_KEY
        },
        {
            everestPrivateKey_1: process.env.EVEREST_PRIVATE_KEY
        }
    ]
}