import { Router } from 'express';

import btcTicker from './routes/showrunners_btcticker';
import ethTicker from './routes/showrunners_ethticker';
import ensDomain from './routes/showrunners_ensdomain';
import compoundTicker from './routes/showrunners_compoundLiquidation';
import gasPrice from './routes/showrunners_gasprice';
import wallet_tracker from './routes/showrunners_wallet_tracker';
import wallet_monitoring from './routes/showrunners_wallet_monitoring';
import everest from './routes/showrunners_everest';
import truefi from './routes/showrunners_truefi';
import socketWeb3 from './routes/sockets/socketWeb3';
import helloWorld from './routes/showrunners_helloWorld';
import aave from './routes/showrunners_aave';

import mailing from './routes/mailing';

// guaranteed to get dependencies
export default () => {
	const app = Router();

	// -- SHOWRUNNERS ROUTES
	btcTicker(app);
	ethTicker(app);
	ensDomain(app);
	compoundTicker(app);
	gasPrice(app);
	wallet_tracker(app);
	everest(app);
	truefi(app);
	wallet_monitoring(app);
	helloWorld(app);
	aave(app);

	// SOCKETS
	socketWeb3(app);

	// -- HELPERS
	// For mailing route
	mailing(app);

	// Finally return app
	return app;
}
