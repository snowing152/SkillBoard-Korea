import { describe, expect, it } from 'vitest';
import { SEED_PASSWORD } from '../../test/fixtures/credentials';
import { defaultLandingPath, ResetPasswordFormSchema } from './auth-forms';

describe('ResetPasswordFormSchema', () => {
  it('accepts two equal valid passwords', () => {
    expect(
      ResetPasswordFormSchema.safeParse({ password: SEED_PASSWORD, repeat: SEED_PASSWORD }).success,
    ).toBe(true);
  });

  it('reports a mismatch on the repeat field', () => {
    const result = ResetPasswordFormSchema.safeParse({ password: SEED_PASSWORD, repeat: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ['repeat'], message: 'mismatch' });
  });

  it('keeps the shared minimum length', () => {
    expect(ResetPasswordFormSchema.safeParse({ password: 'short', repeat: 'short' }).success).toBe(
      false,
    );
  });
});

describe('defaultLandingPath', () => {
  it('sends talents to their profile and clients to the talent list', () => {
    expect(defaultLandingPath(['TALENT'])).toBe('/me/talent-profile');
    expect(defaultLandingPath(['CLIENT'])).toBe('/talents');
    expect(defaultLandingPath(['ADMIN'])).toBe('/talents');
  });
});
