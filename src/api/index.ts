import { Router } from 'express';

import btcTicker from './routes/showrunners_btcticker';
import ethTicker from './routes/showrunners_ethticker';

// guaranteed to get dependencies
export default () => {
	const app = Router();

	// -- SHOWRUNNERS ROUTES
	btcTicker(app);
	ethTicker(app);

	// Finally return app
	return app;
}
