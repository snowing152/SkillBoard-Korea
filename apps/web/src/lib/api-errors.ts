import {
  type ErrorCode,
  type ErrorResponse,
  ErrorResponseSchema,
  type ReasonCode,
  ReasonCodeSchema,
} from '@skillboard/shared';

/**
 * What a Server Action returns to a Client Component. The UI maps `code` to `t('errors.<CODE>')`
 * (never the API message, docs/conventions.md) and shows `requestId` for support.
 */
export type ActionFailure = {
  ok: false;
  code: ErrorCode;
  requestId?: string;
  details?: NonNullable<ErrorResponse['error']['details']>;
  /** Why the request was refused when the code alone is too coarse (e.g. `WRONG_PASSWORD`). */
  reason?: ReasonCode;
};
export type ActionResult<T = undefined> = { ok: true; data: T } | ActionFailure;

/** Turns the `error` of an openapi-fetch call (or anything thrown) into an ActionFailure. */
export function toActionFailure(error: unknown): ActionFailure {
  const parsed = ErrorResponseSchema.safeParse(error);
  if (!parsed.success) return { ok: false, code: 'INTERNAL' };
  const { error: apiError, requestId } = parsed.data;
  // A reason travels as `details[0].code` (ADR 0017 keeps the error code set fixed).
  const reason = ReasonCodeSchema.safeParse(apiError.details?.[0]?.code);
  return {
    ok: false,
    code: apiError.code,
    requestId,
    ...(apiError.details ? { details: apiError.details } : {}),
    ...(reason.success ? { reason: reason.data } : {}),
  };
}

/** Message key under the `common` namespace for an error code. Keeps the mapping in one place. */
export function errorMessageKey(code: ErrorCode): `errors.${ErrorCode}` {
  return `errors.${code}`;
}
