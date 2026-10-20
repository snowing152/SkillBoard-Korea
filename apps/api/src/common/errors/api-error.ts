import { HttpException } from '@nestjs/common';
import {
  ERROR_CODES,
  type ErrorCode,
  type ErrorResponse,
  type ReasonCode,
} from '@skillboard/shared';

type Details = NonNullable<ErrorResponse['error']['details']>;

/**
 * The one exception services throw for expected failures (ADR 0017).
 *   throw new ApiError('NOT_FOUND', 'Profile not found');
 *   throw new ApiError('FORBIDDEN', 'Verify your email first', undefined, 'EMAIL_NOT_VERIFIED');
 * The global filter turns it into `{ error: { code, message, details? }, requestId }`.
 * A `reason` refines a coarse code (it travels as `details[0].code`, see `ReasonCodeSchema`); the web
 * switches on it. The error code set itself stays fixed.
 */
export class ApiError extends HttpException {
  readonly details?: Details | undefined;

  constructor(
    readonly code: ErrorCode,
    message: string,
    details?: Details,
    reason?: ReasonCode,
  ) {
    super(message, ERROR_CODES[code]);
    this.details = reason ? [{ path: [], message, code: reason }] : details;
  }
}
