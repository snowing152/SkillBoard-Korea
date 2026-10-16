import { describe, expect, it } from 'vitest';
import { googleStartUrl } from './google-url';

describe('googleStartUrl', () => {
  it('builds the API start URL with role, locale and the consent flag', () => {
    expect(googleStartUrl('http://localhost:3001', { role: 'CLIENT', locale: 'ko' })).toBe(
      'http://localhost:3001/v1/auth/google?locale=ko&role=CLIENT&acceptTerms=true',
    );
  });

  it('sends neither role nor consent from the sign-in page', () => {
    expect(googleStartUrl('http://localhost:3001', { locale: 'en' })).toBe(
      'http://localhost:3001/v1/auth/google?locale=en',
    );
  });

  it('encodes the next path', () => {
    const url = googleStartUrl('https://api.example', {
      role: 'TALENT',
      locale: 'en',
      next: '/talents?limit=10',
    });
    expect(url).toContain('next=%2Ftalents%3Flimit%3D10');
  });
});
