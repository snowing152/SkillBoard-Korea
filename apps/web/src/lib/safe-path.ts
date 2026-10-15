import { SafePathSchema } from '@skillboard/shared';

/**
 * `?next=` comes from the URL, so it is untrusted: only an in-site absolute path may be followed, never
 * `//evil.com`, `/\evil.com` or `https://evil.com` (open redirect). The rule lives once, in the shared
 * `SafePathSchema`, which the API applies to its own `next` parameters too.
 */
export function safeNextPath(value: string | string[] | undefined, fallback: string): string {
  const parsed = SafePathSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}
