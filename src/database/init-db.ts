import { UserRole } from '../common/constants/roles';
import { hashPassword } from '../common/utils/password.util';
import { env } from '../config/env';

import { initModels, UserModel } from './models';
import { sequelize } from './sequelize';

const seedAdmin = async (): Promise<void> => {
  if (!env.seedAdmin.enabled) {
    return;
  }

  const existingAdmin = await UserModel.findOne({
    where: {
      email: env.seedAdmin.email.toLowerCase(),
    },
  });

  if (existingAdmin) {
    return;
  }

  await UserModel.create({
    fullName: env.seedAdmin.name,
    email: env.seedAdmin.email.toLowerCase(),
    passwordHash: await hashPassword(env.seedAdmin.password),
    role: UserRole.ADMIN,
    tokenVersion: 0,
  });
};

export const initDatabase = async (): Promise<void> => {
  initModels(sequelize);
  await sequelize.authenticate();

  if (env.db.autoSync) {
    await sequelize.sync(env.db.autoAlter ? { alter: true } : undefined);
  }

  await seedAdmin();
};
