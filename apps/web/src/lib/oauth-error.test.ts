import { describe, expect, it } from 'vitest';
import { oauthErrorKey } from './oauth-error';

describe('oauthErrorKey', () => {
  it('passes the two known codes', () => {
    expect(oauthErrorKey('EMAIL_NOT_VERIFIED')).toBe('EMAIL_NOT_VERIFIED');
    expect(oauthErrorKey('OAUTH_FAILED')).toBe('OAUTH_FAILED');
  });

  it('maps anything else, including repeated parameters, to OAUTH_FAILED', () => {
    expect(oauthErrorKey('<script>alert(1)</script>')).toBe('OAUTH_FAILED');
    expect(oauthErrorKey(['EMAIL_NOT_VERIFIED', 'x'])).toBe('OAUTH_FAILED');
  });
});
