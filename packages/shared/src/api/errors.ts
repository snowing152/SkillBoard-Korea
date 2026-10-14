import { z } from 'zod';

/** Stable error codes (ADR 0017). The web maps `code` to a translated message. */
export const ERROR_CODES = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
} as const;
export type ErrorCode = keyof typeof ERROR_CODES;
export const ErrorCodeSchema = z.enum(Object.keys(ERROR_CODES) as [ErrorCode, ...ErrorCode[]]);

/** Reverse lookup: HTTP status -> code. Unknown statuses fall back to INTERNAL. */
export function errorCodeForStatus(status: number): ErrorCode {
  const match = (Object.entries(ERROR_CODES) as [ErrorCode, number][]).find(
    ([, s]) => s === status,
  );
  return match?.[0] ?? 'INTERNAL';
}

/** One issue inside `details` (shape of a Zod issue, kept minimal and stable). */
export const ErrorDetailSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  code: z.string().optional(),
});

/** Every non-2xx response has exactly this shape. */
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string().meta({ description: 'Human readable, English, for logs and developers' }),
    details: z.array(ErrorDetailSchema).optional(),
  }),
  requestId: z.string(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
