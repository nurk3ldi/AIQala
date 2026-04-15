import 'reflect-metadata';

import fs from 'fs/promises';
import path from 'path';

import { createApp } from './app';
import { env, validateEnv } from './config/env';
import { initDatabase } from './database/init-db';

const bootstrap = async (): Promise<void> => {
  validateEnv();

  await fs.mkdir(path.resolve(process.cwd(), env.uploads.directory), {
    recursive: true,
  });

  await initDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`AIQala backend is running on port ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
