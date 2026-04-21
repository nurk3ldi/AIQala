import { Router } from 'express';

import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/constants/roles';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { upload } from '../../common/middleware/upload.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';
import { AiRepository } from '../ai/ai.repository';
import { AiService } from '../ai/ai.service';
import { GeminiClient } from '../ai/gemini.client';
import { CommentsRepository } from '../comments/comments.repository';
import { CommentsService } from '../comments/comments.service';
import { MediaRepository } from '../media/media.repository';
import { MediaService } from '../media/media.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { NotificationsService } from '../notifications/notifications.service';

import { AssignRequestDto, CreateCommentDto, CreateRequestDto, RequestCommentParamDto, RequestListQueryDto, UpdateCommentDto, UpdateRequestDto, UpdateRequestStatusDto } from './dto/request.dto';
import { RequestsController } from './requests.controller';
import { RequestsRepository } from './requests.repository';
import { RequestsService } from './requests.service';

const router = Router();
const requestsRepository = new RequestsRepository();
const commentsService = new CommentsService(new CommentsRepository());
const mediaService = new MediaService(new MediaRepository());
const notificationsService = new NotificationsService(new NotificationsRepository());
const aiService = new AiService(new AiRepository(), new GeminiClient());
const requestsService = new RequestsService(requestsRepository, commentsService, mediaService, notificationsService, aiService);
const requestsController = new RequestsController(requestsService);

router.post('/', authenticate, authorize(UserRole.USER), validateRequest({ body: CreateRequestDto }), asyncHandler(requestsController.create));
router.get(
  '/my',
  authenticate,
  authorize(UserRole.USER),
  validateRequest({ query: RequestListQueryDto }),
  asyncHandler(requestsController.listMy),
);
router.get(
  '/my/:id',
  authenticate,
  authorize(UserRole.USER),
  validateRequest({ params: IdParamDto }),
  asyncHandler(requestsController.getMyById),
);
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.ORGANIZATION, UserRole.USER),
  validateRequest({ query: RequestListQueryDto }),
  asyncHandler(requestsController.list),
);
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.ORGANIZATION, UserRole.USER),
  validateRequest({ params: IdParamDto }),
  asyncHandler(requestsController.getById),
);
router.patch(
  '/:id/assign',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: AssignRequestDto }),
  asyncHandler(requestsController.assign),
);
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.USER),
  validateRequest({ params: IdParamDto, body: UpdateRequestDto }),
  asyncHandler(requestsController.update),
);
router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ORGANIZATION),
  validateRequest({ params: IdParamDto, body: UpdateRequestStatusDto }),
  asyncHandler(requestsController.updateStatus),
);
router.post(
  '/:id/comment',
  authenticate,
  authorize(UserRole.ORGANIZATION, UserRole.USER),
  validateRequest({ params: IdParamDto, body: CreateCommentDto }),
  asyncHandler(requestsController.addComment),
);
router.patch(
  '/:id/comments/:commentId',
  authenticate,
  authorize(UserRole.ORGANIZATION, UserRole.USER),
  validateRequest({ params: RequestCommentParamDto, body: UpdateCommentDto }),
  asyncHandler(requestsController.updateComment),
);
router.delete(
  '/:id/comments/:commentId',
  authenticate,
  authorize(UserRole.ORGANIZATION, UserRole.USER),
  validateRequest({ params: RequestCommentParamDto }),
  asyncHandler(requestsController.deleteComment),
);
router.post(
  '/:id/media',
  authenticate,
  authorize(UserRole.USER, UserRole.ORGANIZATION),
  validateRequest({ params: IdParamDto }),
  upload.single('file'),
  asyncHandler(requestsController.addMedia),
);
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.USER),
  validateRequest({ params: IdParamDto }),
  asyncHandler(requestsController.delete),
);

export const requestsRouter = router;
