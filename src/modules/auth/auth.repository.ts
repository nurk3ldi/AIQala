import { CreationAttributes } from 'sequelize';

import { UserModel } from '../../database/models';

export class AuthRepository {
  findByEmail(email: string): Promise<UserModel | null> {
    return UserModel.findOne({
      where: {
        email,
      },
    });
  }

  createUser(payload: CreationAttributes<UserModel>): Promise<UserModel> {
    return UserModel.create(payload);
  }
}
