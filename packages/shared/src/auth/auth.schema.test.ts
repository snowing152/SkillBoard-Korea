import { describe, expect, it } from 'vitest';
import { LoginSchema, RegisterSchema } from './auth.schema.js';

describe('RegisterSchema', () => {
  it('normalises the email before validating it', () => {
    const parsed = RegisterSchema.parse({
      email: '  Anna@Example.COM ',
      password: 'Password123!',
      displayName: ' Anna ',
      role: 'TALENT',
    });
    expect(parsed.email).toBe('anna@example.com');
    expect(parsed.displayName).toBe('Anna');
  });

  it('rejects short passwords, bad emails and the ADMIN role', () => {
    const base = { email: 'a@b.co', password: 'Password123!', displayName: 'Anna', role: 'TALENT' };
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
