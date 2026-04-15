import { Router } from 'express';

import { IdParamDto } from '../../common/dto/id-param.dto';
import { ToggleActiveDto } from '../../common/dto/toggle-active.dto';
import { UserRole } from '../../common/constants/roles';
import { authenticate } from '../../common/middleware/auth.middleware';
import { avatarUpload } from '../../common/middleware/upload.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import {
  CreateOrganizationAccountDto,
  CreateOrganizationDto,
  OrganizationAccountParamsDto,
  OrganizationListQueryDto,
  UpdateOrganizationDto,
} from './dto/organization.dto';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationsService } from './organizations.service';

const router = Router();
const repository = new OrganizationsRepository();
const service = new OrganizationsService(repository);
const controller = new OrganizationsController(service);

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ body: CreateOrganizationDto }),
  asyncHandler(controller.create),
);
router.get(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ query: OrganizationListQueryDto }),
  asyncHandler(controller.list),
);
router.get('/me', authenticate, authorize(UserRole.ORGANIZATION), asyncHandler(controller.getMe));
router.get(
  '/:id/accounts',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.listAccounts),
);
router.post(
  '/:id/accounts',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: CreateOrganizationAccountDto }),
  asyncHandler(controller.createAccount),
);
router.patch(
  '/:id/accounts/:accountId/toggle-active',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: OrganizationAccountParamsDto, body: ToggleActiveDto }),
  asyncHandler(controller.toggleAccountActive),
);
router.post(
  '/:id/logo',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  avatarUpload.single('logo'),
  asyncHandler(controller.uploadLogo),
);
router.delete(
  '/:id/logo',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.deleteLogo),
);
router.get(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.getById),
);
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: UpdateOrganizationDto }),
  asyncHandler(controller.update),
);
router.patch(
  '/:id/toggle-active',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: ToggleActiveDto }),
  asyncHandler(controller.toggleActive),
);

export const organizationsRouter = router;
