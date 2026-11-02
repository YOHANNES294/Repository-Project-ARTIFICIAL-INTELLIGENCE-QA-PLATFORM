import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const consoleFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const reqStr = requestId ? `[${requestId}] ` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${reqStr}${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: isProduction
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
  transports: [
    new winston.transports.Console(),
  ],
});
