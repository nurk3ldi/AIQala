import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MulterError } from 'multer';
import { DatabaseError, ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';

import { AppError } from '../errors/app.error';

export const errorHandler = (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
    return;
  }

  if (error instanceof TokenExpiredError || error instanceof JsonWebTokenError) {
    response.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token is invalid or expired',
      },
    });
    return;
  }

  if (error instanceof UniqueConstraintError) {
    response.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A record with the same unique value already exists',
        details: error.errors.map((item) => ({
          path: item.path,
          message: item.message,
        })),
      },
    });
    return;
  }

  if (error instanceof MulterError) {
    response.status(400).json({
      success: false,
      error: {
        code: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR',
        message: error.code === 'LIMIT_FILE_SIZE' ? 'Uploaded file exceeds the allowed size limit' : error.message,
      },
    });
    return;
  }

  if (error instanceof ForeignKeyConstraintError) {
    response.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REFERENCE',
        message: 'A referenced entity does not exist',
      },
    });
    return;
  }

  if (error instanceof DatabaseError) {
    response.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
    });
    return;
  }

  response.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    },
  });
};
