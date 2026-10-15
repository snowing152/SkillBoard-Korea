import { describe, expect, it } from 'vitest';
import { googleStartUrl } from './google-url';

describe('googleStartUrl', () => {
  it('builds the API start URL with role, locale and the consent flag', () => {
    expect(googleStartUrl('http://localhost:3001', { role: 'CLIENT', locale: 'ko' })).toBe(
      'http://localhost:3001/v1/auth/google?role=CLIENT&locale=ko&acceptTerms=true',
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
