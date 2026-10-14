/**
 * `?next=` comes from the URL, so it is untrusted: only an in-site absolute path may be followed,
 * never `//evil.com`, `/\evil.com` or `https://evil.com` (open redirect). The `accounts` spec reuses
 * this as its `SafePathSchema`.
 */
export function safeNextPath(value: string | string[] | undefined, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (value.length > 200 || !value.startsWith('/')) return fallback;
  // `//host` and `/\host` are protocol-relative to a browser; control characters are never legitimate.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return fallback;
  }
  return value;
}
