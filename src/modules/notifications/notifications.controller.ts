import { Request, Response } from 'express';

import { PaginationQueryDto } from '../../common/dto/pagination.dto';

import { NotificationsService } from './notifications.service';

export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  listMine = async (request: Request, response: Response): Promise<void> => {
    const result = await this.notificationsService.listMyNotifications(
      request.user!.id,
      request.query as unknown as PaginationQueryDto,
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  markAsRead = async (request: Request, response: Response): Promise<void> => {
    const result = await this.notificationsService.markAsRead(request.user!.id, request.params.id as string);

    response.status(200).json({
      success: true,
      data: result,
    });
  };
}
