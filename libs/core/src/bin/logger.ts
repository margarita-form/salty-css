import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'debug',
  format: format.combine(format.colorize(), format.cli()),
  transports: [new transports.Console({})],
});
