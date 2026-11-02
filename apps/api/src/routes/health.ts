import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { redis } from '../redis.js';
import { ApiResponse, HealthCheckResponse } from '@ai-qa/shared-types';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  let dbStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';
  let redisStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  try {
    if (redis.status === 'ready' || redis.status === 'connect') {
      await redis.ping();
      redisStatus = 'connected';
    } else {
      await redis.connect();
      await redis.ping();
      redisStatus = 'connected';
    }
  } catch {
    redisStatus = 'disconnected';
  }

  const isHealthy = dbStatus !== 'disconnected' && redisStatus !== 'disconnected';

  const healthData: HealthCheckResponse = {
    status: isHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.1.0',
    services: {
      database: dbStatus,
      redis: redisStatus,
      worker: 'running',
    },
  };

  const response: ApiResponse<HealthCheckResponse> = {
    success: isHealthy,
    data: healthData,
  };

  res.status(isHealthy ? 200 : 503).json(response);
});

healthRouter.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'live',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

healthRouter.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: {
        status: 'ready',
        database: 'ready',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: {
        code: 'NOT_READY',
        message: 'Database connection failed',
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
});
