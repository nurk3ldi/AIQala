import cors from 'cors';
import express from 'express';
import fs from 'fs';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { env } from './config/env';
import { AppError } from './common/errors/app.error';
import { errorHandler } from './common/middleware/error.middleware';
import { notFoundHandler } from './common/middleware/not-found.middleware';
import { generalRateLimiter } from './common/middleware/rate-limit.middleware';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { authRouter } from './modules/auth/auth.routes';
import { categoriesRouter } from './modules/categories/categories.routes';
import { locationsRouter } from './modules/locations/locations.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { organizationsRouter } from './modules/organizations/organizations.routes';
import { requestsRouter } from './modules/requests/requests.routes';
import { usersRouter } from './modules/users/users.routes';

export const createApp = () => {
  const app = express();
  const allowedOrigins = env.cors.origins;

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new AppError(403, 'CORS_FORBIDDEN', 'Origin is not allowed by CORS'));
      },
      credentials: env.cors.credentials,
    }),
  );
  app.use(helmet());
  app.use(generalRateLimiter);
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    `/${env.uploads.directory}`,
    express.static(path.resolve(process.cwd(), env.uploads.directory), {
      dotfiles: 'deny',
      etag: true,
      fallthrough: false,
      index: false,
      setHeaders: (response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self';");
      },
    }),
  );

  app.get('/health', (_request, response) => {
    response.status(200).json({
      success: true,
      data: {
        status: 'ok',
      },
    });
  });

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/organizations', organizationsRouter);
  app.use('/', locationsRouter);
  app.use('/categories', categoriesRouter);
  app.use('/requests', requestsRouter);
  app.use('/notifications', notificationsRouter);
  app.use('/analytics', analyticsRouter);
  app.use('/ai', aiRouter);

  const frontendDistPath = path.resolve(process.cwd(), 'frontend', 'dist');
  if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath, { index: false }));
    app.get('*', (request, response, next) => {
      if (request.method !== 'GET') {
        next();
        return;
      }

      response.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
