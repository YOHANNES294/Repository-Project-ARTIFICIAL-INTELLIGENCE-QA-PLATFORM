import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger.js';
import { errorHandler, NotFoundError } from './errors.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.routes.js';
import { organizationRouter } from './routes/org.routes.js';
import { projectRouter } from './routes/project.routes.js';

export function createApp(): Express {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request correlation ID and logger middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
        requestId,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      });
    });

    next();
  });

  // Base API routes
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organizations', organizationRouter);
  app.use('/api/v1/projects', projectRouter);

  // Fallback 404 handler
  app.use((req: Request) => {
    throw new NotFoundError(`Endpoint not found: ${req.method} ${req.originalUrl}`);
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
