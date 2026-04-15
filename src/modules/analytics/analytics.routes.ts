import { Router } from 'express';

import { UserRole } from '../../common/constants/roles';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

const router = Router();
const service = new AnalyticsService(new AnalyticsRepository());
const controller = new AnalyticsController(service);

router.get('/overview', authenticate, authorize(UserRole.ADMIN), asyncHandler(controller.getOverview));

export const analyticsRouter = router;
