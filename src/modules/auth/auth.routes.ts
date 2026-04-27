import { Router } from 'express';

import { authRateLimiter } from '../../common/middleware/rate-limit.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import { AuthAttemptsStore } from './auth-attempts.store';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const router = Router();
const authRepository = new AuthRepository();
const authService = new AuthService(authRepository, new AuthAttemptsStore());
const authController = new AuthController(authService);

router.post('/register', authRateLimiter, validateRequest({ body: RegisterDto }), asyncHandler(authController.register));
router.post('/login', authRateLimiter, validateRequest({ body: LoginDto }), asyncHandler(authController.login));
router.post('/mobile/login', authRateLimiter, validateRequest({ body: LoginDto }), asyncHandler(authController.mobileLogin));

export const authRouter = router;
