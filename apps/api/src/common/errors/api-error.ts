import { HttpException } from '@nestjs/common';
import { ERROR_CODES, type ErrorCode, type ErrorResponse } from '@skillboard/shared';

type Details = NonNullable<ErrorResponse['error']['details']>;

/**
 * The one exception services throw for expected failures (ADR 0017).
 *   throw new ApiError('NOT_FOUND', 'Profile not found');
 * The global filter turns it into `{ error: { code, message, details? }, requestId }`.
 */
export class ApiError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Details,
  ) {
    super(message, ERROR_CODES[code]);
  }
}
