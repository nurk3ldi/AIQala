import { Router } from 'express';

import { IdParamDto } from '../../common/dto/id-param.dto';
import { UserRole } from '../../common/constants/roles';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validateRequest } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/async-handler';

import {
  CreateCityDto,
  CreateDistrictDto,
  DistrictListQueryDto,
  UpdateCityDto,
  UpdateDistrictDto,
} from './dto/location.dto';
import { LocationsController } from './locations.controller';
import { LocationsRepository } from './locations.repository';
import { LocationsService } from './locations.service';

const router = Router();
const repository = new LocationsRepository();
const service = new LocationsService(repository);
const controller = new LocationsController(service);

router.post('/cities', authenticate, authorize(UserRole.ADMIN), validateRequest({ body: CreateCityDto }), asyncHandler(controller.createCity));
router.get('/cities', authenticate, asyncHandler(controller.listCities));
router.patch(
  '/cities/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: UpdateCityDto }),
  asyncHandler(controller.updateCity),
);
router.delete(
  '/cities/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.deleteCity),
);

router.post(
  '/districts',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ body: CreateDistrictDto }),
  asyncHandler(controller.createDistrict),
);
router.get('/districts', authenticate, validateRequest({ query: DistrictListQueryDto }), asyncHandler(controller.listDistricts));
router.patch(
  '/districts/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto, body: UpdateDistrictDto }),
  asyncHandler(controller.updateDistrict),
);
router.delete(
  '/districts/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: IdParamDto }),
  asyncHandler(controller.deleteDistrict),
);

export const locationsRouter = router;
