import { CreationAttributes } from 'sequelize';

import { NotificationModel } from '../../database/models';

export class NotificationsRepository {
  create(payload: CreationAttributes<NotificationModel>): Promise<NotificationModel> {
    return NotificationModel.create(payload);
  }

  listByUser(userId: string, offset: number, limit: number) {
    return NotificationModel.findAndCountAll({
      where: {
        userId,
      },
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });
  }

  findById(id: string): Promise<NotificationModel | null> {
    return NotificationModel.findByPk(id);
  }
}
