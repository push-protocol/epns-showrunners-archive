import 'reflect-metadata'; // We need this in order to use @Decorators

import config from './config';

import express from 'express';

import Logger from './loaders/logger';

async function startServer() {
  const app = express();

  /**
   * A little hack here
   * Import/Export can only be used in 'top-level code'
   * Well, at least in node 10 without babel and at the time of writing
   * So we are using good old require.
   **/
  await require('./loaders').default({ expressApp: app });

  app.listen(config.port, err => {
    if (err) {
      Logger.error(err);
      process.exit(1);
      return;
    }

Logger.info(`
      ################################################
      ____  _
     / ___|| |__   _____      ___ __ _   _ _ __  _ __   ___ _ __ ___
     \\___ \\| '_ \\ / _ \\ \\ /\\ / / '__| | | | '_ \\| '_ \\ / _ \\ '__/ __|
      ___) | | | | (_) \\ V  V /| |  | |_| | | | | | | |  __/ |  \\__ \\
     |____/|_| |_|\\___/ \\_/\\_/ |_|   \\__,_|_| |_|_| |_|\\___|_|  |___/

      🛡️ Server listening on port: ${config.port} 🛡️
      
      ################################################
    `);
  });
}

try {
  startServer();
} catch (error) {
  console.log(error)
}
