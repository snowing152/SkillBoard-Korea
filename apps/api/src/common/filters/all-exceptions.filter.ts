import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ErrorResponse, errorCodeForStatus } from '@skillboard/shared';
import type { Request, Response } from 'express';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { ApiError } from '../errors/api-error.js';

/**
 * Every non-2xx response goes through here and comes out in the shape of ErrorResponseSchema (ADR 0017).
 * 5xx details are logged with the requestId and never sent to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const requestId = req.id;

    const { status, body } = this.toResponse(exception, requestId);
    if (status >= 500) {
      this.logger.error(
        // `path`, not `url`: the query string can hold an OAuth code or a state token (rule 11).
        `${req.method} ${req.path} -> ${status} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    res.status(status).json(body);
  }

  private toResponse(
    exception: unknown,
    requestId: string,
  ): { status: number; body: ErrorResponse } {
    // Zod input validation (nestjs-zod pipe) -> 400 with issue list.
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const details = zodError instanceof ZodError ? zodError.issues.map(toDetail) : undefined;
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            ...(details ? { details } : {}),
          },
          requestId,
        },
      };
    }
    // The service returned something that does not match its output schema: a bug, not a client error.
    if (exception instanceof ZodSerializationException) {
      return internal(requestId);
    }
    if (exception instanceof ApiError) {
      return {
        status: exception.getStatus(),
        body: {
          error: {
            code: exception.code,
            message: exception.message,
            ...(exception.details ? { details: exception.details } : {}),
          },
          requestId,
        },
      };
    }
    // Any other Nest HttpException (NotFound for unknown routes, Throttler 429, ...).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: {
          error: { code: errorCodeForStatus(status), message: httpMessage(exception) },
          requestId,
        },
      };
    }
    return internal(requestId);
  }
}

function internal(requestId: string): { status: number; body: ErrorResponse } {
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { error: { code: 'INTERNAL', message: 'Internal server error' }, requestId },
  };
}

function httpMessage(exception: HttpException): string {
  const response: unknown = exception.getResponse();
  if (typeof response === 'string') return response;
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const m: unknown = response.message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m)) return m.map(String).join('; ');
  }
  return exception.message;
}

function toDetail(issue: ZodError['issues'][number]) {
  return {
    path: issue.path.map((p) => (typeof p === 'symbol' ? p.toString() : p)),
    message: issue.message,
    code: issue.code,
  };
}
