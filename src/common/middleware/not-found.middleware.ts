import { Request, Response } from 'express';

export const notFoundHandler = (request: Request, response: Response): void => {
  response.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.originalUrl} not found`,
    },
  });
};
