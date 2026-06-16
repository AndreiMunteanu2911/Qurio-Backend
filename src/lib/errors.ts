import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'not_found', 'The requested resource was not found.'));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'validation_error',
        message: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
      }
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Something went wrong. Please try again.'
    }
  });
}
