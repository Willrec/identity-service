import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { env } from './config/env.js';
import { API_PREFIX } from './config/constants.js';
import { requestId } from './middleware/requestId.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { router } from './routes/index.js';
import { openApiRouter } from './docs/openapi.js';
import { testRouter } from './modules/auth/routes/test.router.js';
import { logger } from './shared/logger.js';

export function createApp(): express.Application {
  const app = express();

  // Trust Cloudflare → Nginx → Docker → Express proxy chain
  app.set('trust proxy', 1);

  // Middleware — order is intentional
  app.use(compression());
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID
  app.use(requestId);

  // Request logger
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url, requestId: req.id }, 'Incoming request');
    next();
  });

  // Docs — Swagger UI (/docs) and raw spec (/docs/openapi.json)
  // Disabled in production to avoid leaking the API surface.
  if (env.NODE_ENV !== 'production') {
    app.use(openApiRouter);
  }

  // Routes
  app.use(API_PREFIX, router);

  // Test-only routes
  if (env.NODE_ENV === 'test') {
    app.use(API_PREFIX, testRouter);
  }

  // 404 & error handling — must be last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
