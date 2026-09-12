import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { ErrorResponseBody, ErrorDetail } from '../common/errors/app-error.js';
import { AppError, errorCodeForStatus } from '../common/errors/app-error.js';

function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: ErrorResponseBody['error']['code'],
  message: string,
  details: ErrorDetail[] = [],
): FastifyReply {
  const body: ErrorResponseBody = {
    error: { code, message, ...(details.length > 0 ? { details } : {}) },
  };
  return reply.status(statusCode).send(body);
}

function errorResponseFor(error: FastifyError): {
  statusCode: number;
  code: ErrorResponseBody['error']['code'];
  message: string;
  details: ErrorDetail[];
} {
  if (error instanceof ZodError) {
    const details: ErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.join('.') || 'body',
      message: issue.message,
    }));
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid request', details };
  }

  if (Array.isArray(error.validation)) {
    const details: ErrorDetail[] = error.validation.map((item) => {
      const field = item.instancePath.replace(/^\//, '') || 'body';
      return { field, message: item.message ?? 'Invalid value' };
    });
    return { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid request', details };
  }

  const statusCode =
    typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500
      ? error.statusCode
      : 500;

  return { statusCode, code: errorCodeForStatus(statusCode), message: error.message, details: [] };
}

export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) =>
    sendError(reply, 404, 'NOT_FOUND', `Route ${request.method} ${request.url} not found`),
  );

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      request.log.warn({ err: error }, 'Request failed');
      return sendError(reply, error.statusCode, error.code, error.message, error.details);
    }

    const response = errorResponseFor(error);

    if (response.statusCode === 500) {
      request.log.error({ err: error }, 'Unhandled error');
      const message = app.config.isProduction ? 'Internal server error' : error.message;
      return sendError(reply, 500, 'INTERNAL_ERROR', message);
    }

    request.log.warn({ err: error }, 'Request failed');
    return sendError(reply, response.statusCode, response.code, response.message, response.details);
  });
}
