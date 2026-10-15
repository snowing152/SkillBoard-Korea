import { describe, expect, it } from 'vitest';
import { isActivePath } from './nav';

describe('isActivePath', () => {
  it('matches home only on the home page', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/talents', '/')).toBe(false);
  });

  it('matches an item and its sub-pages, not look-alike prefixes', () => {
    expect(isActivePath('/me/talent-profile', '/me/talent-profile')).toBe(true);
    expect(isActivePath('/me/talent-profile/edit', '/me/talent-profile')).toBe(true);
    expect(isActivePath('/me/talent-profiles', '/me/talent-profile')).toBe(false);
  });
});
