import util from 'util';
import { createLogger, format, transports } from 'winston';
import { ConsoleTransportInstance, FileTransportInstance } from 'winston/lib/winston/transports';
import config from '../config/config';
import { EApplicationEnvironment } from '../constant/application';
import path from 'path';
import { red, blue, yellow, green, magenta } from 'colorette';
import * as sourceMapSupport from 'source-map-support';
import { TransformableInfo } from 'logform';

// Enable source map support for stack traces
sourceMapSupport.install();

const colorizeLevel = (level: string) => {
  switch (level.toUpperCase()) {
    case 'ERROR':
      return red(level);
    case 'INFO':
      return blue(level);
    case 'WARN':
      return yellow(level);
    default:
      return level;
  }
};

const consoleLogFormat = format.printf((info: TransformableInfo & { meta?: Record<string, unknown> }) => {
  const { level, message, timestamp, meta = {} } = info;
  const customLevel = colorizeLevel(level.toUpperCase());
  const customTimestamp = green(timestamp as string);
  const customMeta = util.inspect(meta, {
    showHidden: false,
    depth: null,
    colors: true,
  });

  return `${customLevel} [${customTimestamp}] ${message}\n${magenta('META')} ${customMeta}\n`;
});

const fileLogFormat = format.printf((info: TransformableInfo & { meta?: Record<string, unknown> }) => {
  const { level, message, timestamp, meta = {} } = info;
  const logMeta: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (value instanceof Error) {
      logMeta[key] = {
        name: value.name,
        message: value.message,
        trace: value.stack || '',
      };
    } else {
      logMeta[key] = value;
    }
  }

  const logData = {
    level: level.toUpperCase(),
    message,
    timestamp,
    meta: logMeta,
  };

  return JSON.stringify(logData, null, 4);
});

const consoleTransport = (): ConsoleTransportInstance[] => {
  if (config.ENV === EApplicationEnvironment.DEVELOPMENT) {
    return [
      new transports.Console({
        level: 'info',
        format: format.combine(format.timestamp(), consoleLogFormat),
      }),
    ];
  }
  return [];
};

const fileTransport = (): FileTransportInstance[] => {
  return [
    new transports.File({
      filename: path.join(__dirname, '../../logs', `${config.ENV}.log`),
      level: 'info',
      format: format.combine(format.timestamp(), fileLogFormat),
    }),
  ];
};

// 👇 Export your final logger
export default createLogger({
  defaultMeta: { meta: {} },
  transports: [...fileTransport(), ...consoleTransport()],
});
