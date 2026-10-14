import { describe, expect, it } from 'vitest';
import { stripLocalePrefix } from './path';

describe('stripLocalePrefix', () => {
  it('removes a locale prefix and keeps the rest', () => {
    expect(stripLocalePrefix('/ko/me/account')).toBe('/me/account');
    expect(stripLocalePrefix('/ru/me/talent-profile/edit?x=1')).toBe('/me/talent-profile/edit?x=1');
    expect(stripLocalePrefix('/ko')).toBe('/');
    expect(stripLocalePrefix('/ko?x=1')).toBe('/?x=1');
  });

  it('leaves unprefixed paths and look-alikes alone', () => {
    expect(stripLocalePrefix('/me/account')).toBe('/me/account');
    expect(stripLocalePrefix('/korea/me')).toBe('/korea/me');
    expect(stripLocalePrefix('/')).toBe('/');
  });
});
