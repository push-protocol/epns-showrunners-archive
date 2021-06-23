import { Router } from 'express';

import btcTicker from './routes/showrunners_btcticker';
import ethTicker from './routes/showrunners_ethticker';
import ensDomain from './routes/showrunners_ensdomain';
import compoundTicker from './routes/showrunners_compoundLiquidation';
import gasPrice from './routes/showrunners_gasprice';
import wallet_tracker from './routes/showrunners_wallet_tracker';
import wallet_monitoring from './routes/showrunners_wallet_monitoring';
import everest from './routes/showrunners_everest';
import socketWeb3 from './routes/sockets/socketWeb3';
import aave from './routes/showrunners_aave';

import btcTicker_sdk from './routes/showrunners_sdk/showrunners_btcticker';
import ethTicker_sdk from './routes/showrunners_sdk/showrunners_ethticker';
import ensDomain_sdk from './routes/showrunners_sdk/showrunners_ensdomain';
import compoundTicker_sdk from './routes/showrunners_sdk/showrunners_compoundLiquidation';
import gasPrice_sdk from './routes/showrunners_sdk/showrunners_gasprice';
import wallet_tracker_sdk from './routes/showrunners_sdk/showrunners_wallet_tracker';
import everest_sdk from './routes/showrunners_sdk/showrunners_everest';
import truefi_sdk from './routes/showrunners_sdk/showrunners_truefi';
import alphahomora_sdk from './routes/showrunners_sdk/showrunners_alphaHomora';
import helloWorld_sdk from './routes/showrunners_sdk/showrunners_helloWorld';
import aave_sdk from './routes/showrunners_sdk/showrunners_aave';

import mailing from './routes/mailing';

// guaranteed to get dependencies
export default () => {
	const app = Router();

	// -- SHOWRUNNERS ROUTES
	ensDomain(app);
	compoundTicker(app);
	everest(app);
	wallet_monitoring(app);
	// aave(app);

	btcTicker_sdk(app);
	ethTicker_sdk(app);	
	gasPrice_sdk(app);
	wallet_tracker_sdk(app);
	truefi_sdk(app);
	helloWorld_sdk(app);
	alphahomora_sdk(app);
	aave_sdk(app);

	// SOCKETS
	socketWeb3(app);

	// -- HELPERS
	// For mailing route
	mailing(app);

	// Finally return app
	return app;
}
