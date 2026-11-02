import dotenv from 'dotenv';
dotenv.config();

import { Worker, Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from './logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) return null;
    return Math.min(times * 100, 3000);
  },
});

connection.on('connect', () => {
  logger.info('Worker Redis connection established');
});

connection.on('error', (err) => {
  logger.warn(`Worker Redis connection error: ${err.message}`);
});

export const defaultQueue = new Queue('ai-qa-jobs', { connection });

export const backgroundWorker = new Worker(
  'ai-qa-jobs',
  async (job) => {
    logger.info(`Processing job ${job.id} of type ${job.name}`);
    return { processed: true, timestamp: new Date().toISOString() };
  },
  { connection }
);

backgroundWorker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

backgroundWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

logger.info('AI QA Background Worker initialized and listening for jobs.');

process.on('SIGTERM', async () => {
  logger.info('Shutting down background worker...');
  await backgroundWorker.close();
  connection.disconnect();
  process.exit(0);
});
