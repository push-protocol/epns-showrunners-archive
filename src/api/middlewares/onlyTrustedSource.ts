import { Container } from 'typedi';
import config from '../../config';

var dns = require('dns');
var os = require('os');
var ifaces = os.networkInterfaces();

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
    var origin = req.get('origin');

    if (!origin) {
      // check local host
      var host = req.get('host');

      try {
        const isLocalHost = await checkLocalHost(ip);

        if (!isLocalHost) {
          return res.sendStatus(401).json({ info: 'Only trusted or localhost connection allowed' });
        }
        else {
          return next();
        }
      }
      catch (e) {
        Logger.error('🔥 Error attaching Only Localhost middleware to req: %o', e);
        return next(e);
      }
    }

    // check trusted url
    var result = !config.trusterURLs.indexOf(origin == -1);

    if (!result) {
      return res.sendStatus(403).json({ info: 'Only meant for trusted urls' });
    }

    return next();
  } catch (e) {
    Logger.error('🔥 Error attaching Only Trusted Source middleware to req: %o', e);
    return next(e);
  }
};

const checkLocalHost = async (address) => {
  return new Promise((resolve, reject) => {
    dns.lookup(address, function(err, addr) {
      if(err) {
        resolve(false);
        return;
      }
      try {
        address = addr;
        Object.keys(ifaces).forEach(function (ifname) {
          ifaces[ifname].forEach(function (iface) {
            if(iface.address === address)
              resolve(true);
          });
        });
        resolve(false);
      }
      catch(err){
        reject(err);
      }
    })
  })
}

export default onlyTrustedSource;
