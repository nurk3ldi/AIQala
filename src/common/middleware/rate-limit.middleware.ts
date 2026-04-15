import rateLimit from 'express-rate-limit';
import { Request } from 'express';

import { env } from '../../config/env';

const buildKey = (request: Request): string => request.user?.id ?? request.ip ?? 'unknown';

const buildRateLimiter = (windowMs: number, max: number, message: string, keyGenerator?: (request: Request) => string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    skip: (request) => request.path === '/health',
    message: {
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message,
      },
    },
  });

export const generalRateLimiter = buildRateLimiter(
  env.security.rateLimit.windowMs,
  env.security.rateLimit.maxRequests,
  'Too many requests, please try again later',
);

export const authRateLimiter = buildRateLimiter(
  env.security.rateLimit.authWindowMs,
  env.security.rateLimit.authMaxRequests,
  'Too many authentication attempts, please try again later',
  (request) => `${request.ip}:${String(request.body?.email ?? 'unknown').toLowerCase()}`,
);

export const aiRateLimiter = buildRateLimiter(
  env.security.rateLimit.aiWindowMs,
  env.security.rateLimit.aiMaxRequests,
  'Too many AI requests, please slow down',
  buildKey,
);
