import { NextFunction, Request, Response } from 'express';

import { UserRole } from '../constants/roles';
import { AppError } from '../errors/app.error';

export const authorize =
  (...roles: UserRole[]) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (!request.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication is required'));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource'));
      return;
    }

    next();
  };
