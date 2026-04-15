import { Router } from 'express';

import { IdParamDto } from '../../common/dto/id-param.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

const router = Router();
const notificationsService = new NotificationsService(new NotificationsRepository());
const controller = new NotificationsController(notificationsService);

router.get('/', authenticate, validateRequest({ query: PaginationQueryDto }), asyncHandler(controller.listMine));
router.patch('/:id/read', authenticate, validateRequest({ params: IdParamDto }), asyncHandler(controller.markAsRead));

export const notificationsRouter = router;
