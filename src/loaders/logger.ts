import winston from 'winston';
import config from '../config';

const prettyJson = winston.format.printf(info => {
  if (info.message.constructor === Object) {
    info.message = JSON.stringify(info.message, null, 4)
  }
  return `${info.level}: ${info.message}`
})

var options = {
  file: {
    level: 'info',
    filename: `${config.staticAppPath}/logs/app.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: true,
  },
};

const transports = [];
if (process.env.NODE_ENV !== 'development') {
  transports.push(
    new winston.transports.Console(),
    new winston.transports.File(options.file)
  )
} else {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.cli(),
        winston.format.splat(),
        winston.format.colorize({
          // all: true
        }),
      ),
    }),
    new winston.transports.File(options.file)
  )
}

const LoggerInstance = winston.createLogger({
  level: config.logs.level,
  levels: winston.config.npm.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports
});

export default LoggerInstance;
