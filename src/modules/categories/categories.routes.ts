import { Router } from 'express';

import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/constants/roles';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import {
  BindOrganizationParamsDto,
  CategoryOrganizationsQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

const router = Router();
const repository = new CategoriesRepository();
const service = new CategoriesService(repository);
const controller = new CategoriesController(service);

router.post('/', authenticate, authorize(UserRole.ADMIN), validateRequest({ body: CreateCategoryDto }), asyncHandler(controller.create));
router.get('/', authenticate, asyncHandler(controller.list));
router.get('/:id', authenticate, validateRequest({ params: IdParamDto }), asyncHandler(controller.getById));
router.patch(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: UpdateCategoryDto }),
  asyncHandler(controller.update),
);
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.delete),
);
router.post(
  '/:id/organizations/:organizationId',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: BindOrganizationParamsDto }),
  asyncHandler(controller.bindOrganization),
);
router.get(
  '/:id/organizations',
  authenticate,
  validateRequest({ params: IdParamDto, query: CategoryOrganizationsQueryDto }),
  asyncHandler(controller.listBoundOrganizations),
);
router.delete(
  '/:id/organizations/:organizationId',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: BindOrganizationParamsDto }),
  asyncHandler(controller.unbindOrganization),
);

export const categoriesRouter = router;
