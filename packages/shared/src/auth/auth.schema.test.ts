import { describe, expect, it } from 'vitest';
import { TEST_PASSWORD } from '../../test/fixtures/credentials.js';
import { LoginSchema, RegisterSchema } from './auth.schema.js';

describe('RegisterSchema', () => {
  it('normalises the email before validating it', () => {
    const parsed = RegisterSchema.parse({
      email: '  Anna@Example.COM ',
      password: TEST_PASSWORD,
      displayName: ' Anna ',
      role: 'TALENT',
      acceptTerms: true,
    });
    expect(parsed.email).toBe('anna@example.com');
    expect(parsed.displayName).toBe('Anna');
  });

  it('rejects short passwords, bad emails and the ADMIN role', () => {
    const base = {
      email: 'a@b.co',
      password: TEST_PASSWORD,
      displayName: 'Anna',
      role: 'TALENT',
      acceptTerms: true,
    };
    expect(RegisterSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
    expect(RegisterSchema.safeParse({ ...base, role: 'ADMIN' }).success).toBe(false);
  });
});

describe('LoginSchema', () => {
  it('requires both fields', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.co' }).success).toBe(false);
  });
});
