import { z } from 'zod';

/**
 * Why a request was refused, when the error `code` alone is too coarse. The error code set of ADR 0017
 * stays fixed; a reason travels as `details: [{ path: [], message, code: <reason> }]` and the web
 * switches on it (`ActionFailure.reason`). Owned by the `accounts` spec, used by the later ones.
 */
export const REASON_CODES = [
  'EMAIL_NOT_VERIFIED',
  'WRONG_PASSWORD',
  'NO_PASSWORD_SET',
  'OWN_PROFILE',
  'ADMIN_ACCOUNT',
] as const;
export const ReasonCodeSchema = z.enum(REASON_CODES);
export type ReasonCode = z.infer<typeof ReasonCodeSchema>;
