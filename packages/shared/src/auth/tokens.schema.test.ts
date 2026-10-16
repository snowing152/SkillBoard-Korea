import { describe, expect, it } from 'vitest';
import { TEST_PASSWORD, TEST_OTHER_PASSWORD } from '../../test/fixtures/credentials.js';
import { ChangePasswordSchema, RegisterSchema, UpdateMeSchema } from './auth.schema.js';
import { OAUTH_CALLBACK_ERRORS } from './oauth.js';
import { SafePathSchema } from './safe-path.js';
import {
  ExchangeSchema,
  GoogleCompleteSchema,
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
  const base = { email: 'a@b.co', password: TEST_PASSWORD, displayName: 'Anna', role: 'CLIENT' };

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
      currentPassword: TEST_PASSWORD,
      newPassword: TEST_PASSWORD,
    });
    expect(same.success).toBe(false);
    expect(
      ChangePasswordSchema.safeParse({
        currentPassword: TEST_PASSWORD,
        newPassword: TEST_OTHER_PASSWORD,
      }).success,
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
    expect(PasswordResetConfirmSchema.safeParse({ token: TOKEN, password: 'short' }).success).toBe(
      false,
    );
  });

  it('logout defaults `all` to false', () => {
    expect(LogoutSchema.parse({}).all).toBe(false);
  });

  it('Google start takes a signup role and a safe next', () => {
    const base = { role: 'CLIENT', locale: 'ru' };
    expect(GoogleStartQuerySchema.safeParse(base).success).toBe(true);
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

describe('Google role-choice step', () => {
  it('start query carries no consent: acceptTerms is dropped, a role alone is fine', () => {
    const base = { locale: 'en' };
    expect(GoogleStartQuerySchema.safeParse(base).success).toBe(true);
    expect(GoogleStartQuerySchema.safeParse({ ...base, role: 'TALENT' }).success).toBe(true);
    const parsed = GoogleStartQuerySchema.parse({ ...base, role: 'TALENT', acceptTerms: 'true' });
    expect(parsed).not.toHaveProperty('acceptTerms');
  });

  it('complete: needs a token, a signup role and the consent flag', () => {
    const ok = { signupToken: 'x'.repeat(43), role: 'CLIENT', locale: 'ko', acceptTerms: true };
    expect(GoogleCompleteSchema.safeParse(ok).success).toBe(true);
    expect(GoogleCompleteSchema.safeParse({ ...ok, acceptTerms: false }).success).toBe(false);
    expect(GoogleCompleteSchema.safeParse({ ...ok, role: 'ADMIN' }).success).toBe(false);
    expect(GoogleCompleteSchema.safeParse({ ...ok, signupToken: 'short' }).success).toBe(false);
  });
});

describe('ChangePasswordSchema refresh token', () => {
  it('is optional and length-bounded', () => {
    const base = { currentPassword: TEST_PASSWORD, newPassword: TEST_OTHER_PASSWORD };
    expect(ChangePasswordSchema.safeParse(base).success).toBe(true);
    expect(ChangePasswordSchema.safeParse({ ...base, refreshToken: 'r'.repeat(43) }).success).toBe(
      true,
    );
    expect(ChangePasswordSchema.safeParse({ ...base, refreshToken: 'short' }).success).toBe(false);
  });
});
