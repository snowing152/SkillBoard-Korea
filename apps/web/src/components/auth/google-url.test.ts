import { describe, expect, it } from 'vitest';
import { googleStartPath } from './google-url';

describe('googleStartPath', () => {
  it('points at the web start route, with the locale prefix for non-default languages', () => {
    expect(googleStartPath({ locale: 'en' })).toBe('/auth/google');
    expect(googleStartPath({ locale: 'ko' })).toBe('/ko/auth/google');
  });

  it('sends role and consent together, only from the sign-up page', () => {
    expect(googleStartPath({ role: 'CLIENT', locale: 'ru' })).toBe(
      '/ru/auth/google?role=CLIENT&acceptTerms=true',
    );
    expect(googleStartPath({ locale: 'en', next: '/talents' })).not.toContain('role');
  });

  it('encodes the next path', () => {
    expect(googleStartPath({ locale: 'en', next: '/talents?limit=10' })).toContain(
      'next=%2Ftalents%3Flimit%3D10',
    );
  });
});
