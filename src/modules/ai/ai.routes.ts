import { Router } from 'express';

import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/constants/roles';
import { authenticate } from '../../common/middleware/auth.middleware';
import { aiRateLimiter } from '../../common/middleware/rate-limit.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import { AiController } from './ai.controller';
import { AiRepository } from './ai.repository';
import { AiService } from './ai.service';
import { DraftCommentDto, AnalyzeIssueDto, ModerateTextDto, EnhanceDescriptionDto, ChatDto } from './dto/ai.dto';
import { GeminiClient } from './gemini.client';

const router = Router();
const aiService = new AiService(new AiRepository(), new GeminiClient());
const controller = new AiController(aiService);

router.post('/moderate', authenticate, aiRateLimiter, validateRequest({ body: ModerateTextDto }), asyncHandler(controller.moderateText));
router.post('/requests/analyze', authenticate, aiRateLimiter, validateRequest({ body: AnalyzeIssueDto }), asyncHandler(controller.analyzeIssue));
router.post('/enhance-description', authenticate, aiRateLimiter, validateRequest({ body: EnhanceDescriptionDto }), asyncHandler(controller.enhanceDescription));
router.post('/chat', authenticate, aiRateLimiter, validateRequest({ body: ChatDto }), asyncHandler(controller.chat));
router.post(
  '/requests/:id/analyze',
  authenticate,
  aiRateLimiter,
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.analyzeExistingRequest),
);
router.post(
  '/requests/:id/draft-comment',
  authenticate,
  aiRateLimiter,
  authorize(UserRole.ADMIN, UserRole.ORGANIZATION),
  validateRequest({ params: IdParamDto, body: DraftCommentDto }),
  asyncHandler(controller.draftComment),
);

export const aiRouter = router;
