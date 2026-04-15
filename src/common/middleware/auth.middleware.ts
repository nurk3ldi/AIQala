import { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app.error';
import { verifyAccessToken } from '../utils/jwt.util';
import { asyncHandler } from '../utils/async-handler';
import { UserRole } from '../constants/roles';
import { OrganizationModel, UserModel } from '../../database/models';

export const authenticate = asyncHandler(async (request: Request, _response: Response, next: NextFunction) => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Access token is missing');
  }

  const token = authorizationHeader.replace('Bearer ', '').trim();
  const payload = verifyAccessToken(token);

  const user = await UserModel.findByPk(payload.sub, {
    include:
      payload.role === UserRole.ORGANIZATION
        ? [
            {
              model: OrganizationModel,
              as: 'organization',
            },
          ]
        : undefined,
  });

  if (!user || !user.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'User is not authorized');
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AppError(401, 'UNAUTHORIZED', 'Token has been revoked');
  }

  if (user.role === UserRole.ORGANIZATION && user.organizationId) {
    const organization = await OrganizationModel.findByPk(user.organizationId);

    if (!organization || !organization.isActive) {
      throw new AppError(403, 'FORBIDDEN', 'Organization account is inactive');
    }
  }

  request.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  };

  next();
});
