export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponseBody {
  error: {
    code: AppErrorCode;
    message: string;
    details?: ErrorDetail[];
  };
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: AppErrorCode;
  readonly details: ErrorDetail[];

  constructor(
    statusCode: number,
    code: AppErrorCode,
    message: string,
    details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static validation(details: ErrorDetail[], message = 'Invalid request'): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Resource already exists'): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static rateLimited(message = 'Too many requests'): AppError {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}

export function errorCodeForStatus(statusCode: number): AppErrorCode {
  switch (statusCode) {
    case 400:
    case 413:
    case 415:
    case 422:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 429:
      return 'RATE_LIMITED';
    default:
      return statusCode >= 400 && statusCode < 500 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';
  }
}
