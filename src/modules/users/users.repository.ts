import { UserModel } from '../../database/models';

export class UsersRepository {
  findById(id: string): Promise<UserModel | null> {
    return UserModel.findByPk(id);
  }

  findByEmail(email: string): Promise<UserModel | null> {
    return UserModel.findOne({
      where: {
        email,
      },
    });
  }
}
