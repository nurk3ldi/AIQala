import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Request, RequestHandler, Response } from 'express';

import { AppError } from '../errors/app.error';

interface ValidationSchemas {
  body?: new () => object;
  params?: new () => object;
  query?: new () => object;
}

const validatePart = async (
  source: Record<string, unknown>,
  schema?: new () => object,
): Promise<Record<string, unknown> | undefined> => {
  if (!schema) {
    return undefined;
  }

  const instance = plainToInstance(schema, source, {
    enableImplicitConversion: true,
  });

  const errors = await validate(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', errors);
  }

  return instance as Record<string, unknown>;
};

export const validateRequest = (schemas: ValidationSchemas): RequestHandler => {
  return async (request: Request, _response: Response, next: NextFunction) => {
    try {
      const [body, params, query] = await Promise.all([
        validatePart(request.body as Record<string, unknown>, schemas.body),
        validatePart(request.params as Record<string, unknown>, schemas.params),
        validatePart(request.query as Record<string, unknown>, schemas.query),
      ]);

      if (body) {
        request.body = body;
      }

      if (params) {
        request.params = params as Request['params'];
      }

      if (query) {
        request.query = query as Request['query'];
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
