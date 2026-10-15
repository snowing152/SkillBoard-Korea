import { describe, expect, it } from 'vitest';
import { ChangePasswordSchema, RegisterSchema, UpdateMeSchema } from './auth.schema.js';
import { OAUTH_CALLBACK_ERRORS } from './oauth.js';
import { SafePathSchema } from './safe-path.js';
import {
  ExchangeSchema,
  GoogleStartQuerySchema,
  LogoutSchema,
  PasswordResetConfirmSchema,
  RefreshSchema,
} from './tokens.schema.js';

const TOKEN = 'a'.repeat(43);

describe('SafePathSchema', () => {
  it('keeps in-site paths with a query string', () => {
    expect(SafePathSchema.safeParse('/me/account').success).toBe(true);
    expect(SafePathSchema.safeParse('/talents?limit=10').success).toBe(true);
  });

  it('rejects the open-redirect payloads', () => {
    for (const payload of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      'javascript:alert(1)',
      ' //evil.com',
      '/\t/evil.com',
      '/a\nb',
      '',
      `/${'a'.repeat(300)}`,
    ]) {
      expect(SafePathSchema.safeParse(payload).success, JSON.stringify(payload)).toBe(false);
    }
  });
});

describe('RegisterSchema (accounts)', () => {
  const base = { email: 'a@b.co', password: 'Password123!', displayName: 'Anna', role: 'CLIENT' };

  it('requires the consent checkbox and defaults the locale', () => {
    expect(RegisterSchema.safeParse(base).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...base, acceptTerms: false }).success).toBe(false);
    const parsed = RegisterSchema.parse({ ...base, acceptTerms: true });
    expect(parsed.locale).toBe('en');
  });
});

describe('ChangePasswordSchema', () => {
  it('rejects a new password equal to the current one', () => {
    const same = ChangePasswordSchema.safeParse({
      currentPassword: 'Password123!',
      newPassword: 'Password123!',
    });
    expect(same.success).toBe(false);
    expect(
      ChangePasswordSchema.safeParse({ currentPassword: 'Password123!', newPassword: 'Other-456!' })
        .success,
    ).toBe(true);
  });
});

describe('UpdateMeSchema', () => {
  it('accepts a partial update and rejects an unknown locale', () => {
    expect(UpdateMeSchema.safeParse({ locale: 'ko' }).success).toBe(true);
    expect(UpdateMeSchema.safeParse({ locale: 'de' }).success).toBe(false);
    expect(UpdateMeSchema.parse({ displayName: '  Anna ' }).displayName).toBe('Anna');
  });
});

describe('token schemas', () => {
  it('bound the token length', () => {
    expect(RefreshSchema.safeParse({ refreshToken: 'short' }).success).toBe(false);
    expect(RefreshSchema.safeParse({ refreshToken: TOKEN }).success).toBe(true);
    expect(ExchangeSchema.safeParse({ code: 'x'.repeat(201) }).success).toBe(false);
    expect(
      PasswordResetConfirmSchema.safeParse({ token: TOKEN, password: 'short' }).success,
    ).toBe(false);
  });

  it('logout defaults `all` to false', () => {
    expect(LogoutSchema.parse({}).all).toBe(false);
  });

  it('Google start takes acceptTerms only as the string "true" and a safe next', () => {
    const base = { role: 'CLIENT', locale: 'ru', acceptTerms: 'true' };
    expect(GoogleStartQuerySchema.safeParse(base).success).toBe(true);
    expect(GoogleStartQuerySchema.safeParse({ ...base, acceptTerms: 'false' }).success).toBe(false);
    expect(GoogleStartQuerySchema.safeParse({ ...base, role: 'ADMIN' }).success).toBe(false);
    expect(GoogleStartQuerySchema.safeParse({ ...base, next: '//evil.example' }).success).toBe(
      false,
    );
  });
});

describe('OAUTH_CALLBACK_ERRORS', () => {
  it('lists exactly the two values the callback may use', () => {
    expect([...OAUTH_CALLBACK_ERRORS]).toEqual(['EMAIL_NOT_VERIFIED', 'OAUTH_FAILED']);
  });
});
