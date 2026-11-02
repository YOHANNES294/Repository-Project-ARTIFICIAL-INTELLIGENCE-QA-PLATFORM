import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { logger } from './logger.js';
import { prisma } from './prisma.js';
import { redis } from './redis.js';

const app = createApp();
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`AI QA Platform API Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Gracefully shutting down API server...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected.');
    } catch (err) {
      logger.error('Error disconnecting Prisma:', err);
    }

    try {
      redis.disconnect();
      logger.info('Redis disconnected.');
    } catch (err) {
      logger.error('Error disconnecting Redis:', err);
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully terminating process after 10s timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
