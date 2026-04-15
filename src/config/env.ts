import dotenv from 'dotenv';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment value: ${value}`);
  }

  return parsed;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

const getRequired = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

const parseStringList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildCorsOrigins = (value: string | undefined): string[] => {
  const configuredOrigins = parseStringList(value, ['http://localhost:5173']);

  if ((process.env.NODE_ENV ?? 'development') === 'production') {
    return configuredOrigins;
  }

  return Array.from(
    new Set([
      ...configuredOrigins,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ]),
  );
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseNumber(process.env.PORT, 4000),
  trustProxy: process.env.TRUST_PROXY ?? '1',
  cors: {
    origins: buildCorsOrigins(process.env.CORS_ORIGIN),
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, false),
  },
  db: {
    host: getRequired('DB_HOST', '127.0.0.1'),
    port: parseNumber(process.env.DB_PORT, 5432),
    name: getRequired('DB_NAME', 'smart_city'),
    user: getRequired('DB_USER', 'postgres'),
    password: getRequired('DB_PASSWORD', 'postgres'),
    ssl: parseBoolean(process.env.DB_SSL, false),
    logging: parseBoolean(process.env.DB_LOGGING, false),
    autoSync: parseBoolean(process.env.DB_AUTO_SYNC, true),
    autoAlter: parseBoolean(process.env.DB_AUTO_ALTER, (process.env.NODE_ENV ?? 'development') !== 'production'),
  },
  jwt: {
    secret: getRequired('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    issuer: process.env.JWT_ISSUER ?? 'smart-city-issue-tracker',
    audience: process.env.JWT_AUDIENCE ?? 'smart-city-clients',
    algorithm: 'HS256' as const,
  },
  uploads: {
    directory: process.env.UPLOAD_DIR ?? 'uploads',
    maxFileSizeMb: parseNumber(process.env.UPLOAD_MAX_FILE_SIZE_MB, 25),
  },
  seedAdmin: {
    enabled: parseBoolean(process.env.SEED_ADMIN_ON_STARTUP, false),
    name: process.env.DEFAULT_ADMIN_NAME ?? '',
    email: process.env.DEFAULT_ADMIN_EMAIL ?? '',
    password: process.env.DEFAULT_ADMIN_PASSWORD ?? '',
  },
  ai: {
    enabled: parseBoolean(process.env.AI_ENABLED, false),
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiBaseUrl: process.env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
    analysisModel: process.env.GEMINI_MODEL_ANALYSIS ?? 'gemini-2.5-flash',
    draftModel: process.env.GEMINI_MODEL_DRAFT ?? 'gemini-2.5-flash',
    moderationModel: process.env.GEMINI_MODEL_MODERATION ?? 'gemini-2.5-flash-lite',
    timeoutMs: parseNumber(process.env.GEMINI_TIMEOUT_MS, 30000),
    failClosed: parseBoolean(process.env.AI_FAIL_CLOSED, true),
  },
  security: {
    rateLimit: {
      windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      maxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
      authWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      authMaxRequests: parseNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10),
      aiWindowMs: parseNumber(process.env.AI_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      aiMaxRequests: parseNumber(process.env.AI_RATE_LIMIT_MAX_REQUESTS, 30),
    },
    authLock: {
      maxAttempts: parseNumber(process.env.AUTH_LOCK_MAX_ATTEMPTS, 5),
      windowMs: parseNumber(process.env.AUTH_LOCK_WINDOW_MS, 15 * 60 * 1000),
      lockMs: parseNumber(process.env.AUTH_LOCK_DURATION_MS, 30 * 60 * 1000),
    },
  },
};

export const isProduction = env.nodeEnv === 'production';

const isWeakSecret = (value: string): boolean =>
  value.length < 32 || value === 'change-me-in-production' || value.includes('replace-with');

export const validateEnv = (): void => {
  if (isWeakSecret(env.jwt.secret)) {
    throw new Error('JWT_SECRET must be set to a strong value with at least 32 characters');
  }

  if (env.ai.enabled && !env.ai.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required when AI_ENABLED=true');
  }

  if (env.seedAdmin.enabled) {
    if (!env.seedAdmin.name || !env.seedAdmin.email || !env.seedAdmin.password) {
      throw new Error('DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, and DEFAULT_ADMIN_PASSWORD are required when SEED_ADMIN_ON_STARTUP=true');
    }

    if (env.seedAdmin.password.length < 12) {
      throw new Error('DEFAULT_ADMIN_PASSWORD must be at least 12 characters long');
    }
  }

  if (isProduction) {
    if (env.cors.origins.includes('*')) {
      throw new Error('Wildcard CORS_ORIGIN is not allowed in production');
    }

    if (env.db.autoSync) {
      throw new Error('DB_AUTO_SYNC must be false in production');
    }

    if (env.db.autoAlter) {
      throw new Error('DB_AUTO_ALTER must be false in production');
    }
  }
};
