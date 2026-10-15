import { z } from 'zod';

/**
 * Every `next` parameter (sign-in, Google start, consent) is untrusted URL input. Only an in-site
 * absolute path may be followed: never `//evil.com`, `/\evil.com` or `https://evil.com` (open redirect).
 * Control characters are never legitimate, and browsers strip tabs and newlines, which would turn
 * `/\t/evil.com` into `//evil.com`.
 */
export const SafePathSchema = z
  .string()
  .max(300)
  .regex(/^\/(?![/\\])\S*$/, 'Must be a relative path on this site')
  .refine(
    (value) => ![...value].some((char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f),
    'Must not contain control characters',
  );
export type SafePath = z.infer<typeof SafePathSchema>;
