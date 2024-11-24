import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'debug',
  format: format.combine(format.colorize(), format.cli()),
  transports: [new transports.Console({})],
});

export const logError = (message: string) => {
  logger.error(message);
};
