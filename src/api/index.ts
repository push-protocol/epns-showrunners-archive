import { Router } from 'express';

import btcTicker from './routes/showrunners_btcticker';
import ethTicker from './routes/showrunners_ethticker';
import ensTicker from './routes/showrunners_ensticker';
import gasTicker from './routes/showrunners_gasticker';
import mongodbticker from './routes/showrunner_mongodbticker';


// guaranteed to get dependencies
export default () => {
	const app = Router();

	// -- SHOWRUNNERS ROUTES
	btcTicker(app);
	ethTicker(app);
	ensTicker(app);
	gasTicker(app);
	mongodbticker(app);
	// Finally return app
	return app;
}