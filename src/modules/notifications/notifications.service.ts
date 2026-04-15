import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AppError } from '../../common/errors/app.error';
import { buildPaginatedResponse, buildPagination } from '../../common/utils/query.util';

import { NotificationsRepository } from './notifications.repository';

interface CreateNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
}

export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  createNotification(payload: CreateNotificationPayload) {
    return this.notificationsRepository.create({
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      isRead: false,
    });
  }

  async listMyNotifications(userId: string, query: PaginationQueryDto) {
    const pagination = buildPagination(query.page, query.limit);
    const result = await this.notificationsRepository.listByUser(userId, pagination.offset, pagination.limit);

    return buildPaginatedResponse(result.rows, result.count, pagination.page, pagination.limit);
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationsRepository.findById(notificationId);

    if (!notification || notification.userId !== userId) {
      throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }

    return notification.update({
      isRead: true,
    });
  }
}
