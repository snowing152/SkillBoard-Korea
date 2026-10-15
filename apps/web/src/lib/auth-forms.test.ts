import { describe, expect, it } from 'vitest';
import { defaultLandingPath, ResetPasswordFormSchema } from './auth-forms';

describe('ResetPasswordFormSchema', () => {
  it('accepts two equal valid passwords', () => {
    expect(
      ResetPasswordFormSchema.safeParse({ password: 'Password123!', repeat: 'Password123!' })
        .success,
    ).toBe(true);
  });

  it('reports a mismatch on the repeat field', () => {
    const result = ResetPasswordFormSchema.safeParse({ password: 'Password123!', repeat: 'x' });
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
