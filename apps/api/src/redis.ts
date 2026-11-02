import { Redis } from 'ioredis';
import { logger } from './logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) {
      return null; // Stop retrying after 5 attempts if redis is down
    }
    return Math.min(times * 100, 3000);
  },
});

redis.on('error', (err) => {
  logger.warn(`Redis connection warning: ${err.message}`);
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});
