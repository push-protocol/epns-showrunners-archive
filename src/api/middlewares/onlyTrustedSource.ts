import { Container } from 'typedi';
import config from '../../config';

/**
 * @param {*} req Express req Object
 * @param {*} res  Express res Object
 * @param {*} next  Express next Function
 */
const onlyTrustedSource = async (req, res, next) => {
  const Logger = Container.get('logger');
  try {
    // Check if ip is localhost and only continue
    var ip = req.connection.remoteAddress;
    var host = req.get('host');

    const result = !config.trusterURLs.indexOf(req.get('host') == -1);

    if (!result) {
      return res.sendStatus(403).json({ info: 'Only meant for trusted urls' });
    }

    return next();
  } catch (e) {
    Logger.error('🔥 Error attaching Only Trusted Source middleware to req: %o', e);
    return next(e);
  }
};

export default onlyTrustedSource;
