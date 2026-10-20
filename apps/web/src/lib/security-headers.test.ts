import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('security headers (next.config.ts)', () => {
  it('sends them on every page', async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.find((rule) => rule.source === '/:path*');
    const headers = Object.fromEntries((all?.headers ?? []).map((h) => [h.key, h.value]));

    // Clickjacking: /me/account (password change) and the Google role step must not be framed.
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    // Reset and verification tokens sit in the URL: never sent to another site. Not `no-referrer`:
    // browsers then send `Origin: null` on POST and Next refuses every Server Action.
    expect(headers['Referrer-Policy']).toBe('same-origin');
  });
});
