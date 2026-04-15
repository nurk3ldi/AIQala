import { Sequelize } from 'sequelize';

import { env } from '../config/env';

export const sequelize = new Sequelize({
  database: env.db.name,
  username: env.db.user,
  password: env.db.password,
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.db.logging ? console.log : false,
  dialectOptions: env.db.ssl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
});
