import winston from 'winston';
import config from '../config';

const moment = require('moment'); // time library

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    simulate: 4,
    verbose: 5,
    debug: 6,
    silly: 7,
  },
  colors: {
    info: 'green',
    simulate: 'white bold dim',
    debug: 'yellow',
  }
};

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

const parser = (param: any): string => {
  if (!param) {
    return '';
  }
  if (typeof param === 'string') {
    return param;
  }
  return Object.keys(param).length ? JSON.stringify(param, undefined, 2) : '';
};

const formatter = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.cli(),
  winston.format.splat(),
  winston.format.printf((info) => {
    const { timestamp, level, message, meta } = info;
    const ts = moment(timestamp).local().format('HH:MM:ss');
    const metaMsg = meta ? `: ${parser(meta)}` : '';

    return `${ts} ${level}    ${parser(message)} ${metaMsg}`;
  }),
  winston.format.colorize({
    all: true,
  }),
),

const transports = [];
if (process.env.NODE_ENV !== 'development') {
  transports.push(
    new winston.transports.Console({
      format: formatter
    }),
    new winston.transports.File(options.file)
  )
} else {
  transports.push(
    new winston.transports.Console({
      format: formatter
    }),
    new winston.transports.File(options.file)
  )
}

const LoggerInstance = winston.createLogger({
  level: config.logs.level,
  levels: customLevels.levels,
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

winston.addColors(customLevels.colors);

export default LoggerInstance;
