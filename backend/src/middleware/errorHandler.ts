import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { env } from '../config/env';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: any) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions or cross-tenant access denied', details?: any) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource state conflict', details?: any) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class OptimisticLockError extends AppError {
  constructor(message = 'Concurrent modification detected: this record was updated by another user. Please refresh and try again.', details?: any) {
    super(message, 409, 'STALE_OBJECT_STATE', details);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.id || 'unknown';

  if (err instanceof ZodError) {
    logger.warn({ requestId, error: err.issues }, 'Validation error');
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
      },
      requestId
    });
  }

  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, message: err.message }, 'Application error');
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      requestId
    });
  }

  // Unhandled error
  logger.error({ requestId, err }, 'Unhandled server error');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'An unexpected internal server error occurred' : err.message
    },
    requestId
  });
};
