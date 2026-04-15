import { Router } from 'express';

import { authenticate } from '../../common/middleware/auth.middleware';
import { avatarUpload } from '../../common/middleware/upload.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import { UpdateProfileDto } from './dto/user.dto';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const router = Router();
const usersRepository = new UsersRepository();
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

router.get('/me', authenticate, asyncHandler(usersController.getMe));
router.patch('/me', authenticate, validateRequest({ body: UpdateProfileDto }), asyncHandler(usersController.updateMe));
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), asyncHandler(usersController.uploadAvatar));
router.delete('/me/avatar', authenticate, asyncHandler(usersController.deleteAvatar));

export const usersRouter = router;
