import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthSessionSchema, LEGAL_VERSIONS } from '@skillboard/shared';
import { argon2id, hash } from 'argon2';
import { firstCallArg } from '../../../test/helpers.js';
import { ApiError } from '../../common/errors/api-error.js';
import { MailPort } from '../../common/mail/mail.port.js';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { ConsentsService } from '../consents/consents.service.js';
import { AuthService } from './auth.service.js';
import { TokensService } from './tokens.service.js';

const USER_ID = '019a0000-0000-7000-8000-000000000001';
const TTL = 900;
const PASSWORD = 'Password123!';
const EMAIL = 'anna@example.com';

const env: Record<string, unknown> = {
  JWT_ACCESS_TTL_SECONDS: TTL,
  WEB_URL: 'https://skillboard.example',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_CALLBACK_URL: 'https://api.example/v1/auth/google/callback',
};

describe('AuthService', () => {
  const prisma = {
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    authIdentity: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const consents = { pendingFor: jest.fn(), record: jest.fn() };
  const tokens = {
    issueRefresh: jest.fn(),
    issueOneTime: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    revokeAll: jest.fn(),
    revokeAllExcept: jest.fn(),
    issueOAuthSignup: jest.fn(),
    consumeOAuthSignup: jest.fn(),
    consumeOneTime: jest.fn(),
  };
  const mail = { send: jest.fn() };
  let service: AuthService;
  let jwt: JwtService;

  const row = {
    id: USER_ID,
    email: EMAIL,
    displayName: 'Anna',
    roles: ['TALENT'],
    locale: 'en',
    emailVerifiedAt: null,
    passwordHash: null as string | null,
  };

  beforeEach(async () => {
    consents.pendingFor.mockResolvedValue([]);
    tokens.issueOAuthSignup.mockResolvedValue('opaque-signup-token');
    tokens.issueRefresh.mockResolvedValue({
      token: 'r'.repeat(43),
      expiresAt: new Date('2026-11-14T00:00:00Z'),
    });
    tokens.issueOneTime.mockResolvedValue('t'.repeat(43));
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(prisma));
    mail.send.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'x'.repeat(32), signOptions: { expiresIn: TTL } })],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
        { provide: ConsentsService, useValue: consents },
        { provide: TokensService, useValue: tokens },
        { provide: MailPort, useValue: mail },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  const input = {
    email: EMAIL,
    password: PASSWORD,
    displayName: 'Anna',
    locale: 'ko' as const,
    acceptTerms: true as const,
  };

  describe('register', () => {
    it('stores an argon2id hash, records both consents, mails one link and returns a session', async () => {
      prisma.user.create.mockResolvedValue({ ...row, passwordHash: '$argon2id$stored' });
      const session = await service.register({ ...input, role: 'TALENT' });

      const { data } = firstCallArg(prisma.user.create) as {
        data: { passwordHash: string; locale: string; roles: string[] };
      };
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);
      expect(data.passwordHash).not.toContain(PASSWORD);
      expect(data).toMatchObject({ locale: 'ko', roles: ['TALENT'] });

      expect(consents.record).toHaveBeenCalledWith(USER_ID, ['TERMS', 'PRIVACY'], 'ko', prisma);
      expect(tokens.issueOneTime).toHaveBeenCalledWith(USER_ID, 'EMAIL_VERIFY');
      expect(mail.send).toHaveBeenCalledTimes(1);
      const sent = firstCallArg(mail.send) as { to: string; text: string };
      expect(sent.to).toBe(EMAIL);
      expect(sent.text).toContain('https://skillboard.example/ko/verify-email?token=');

      expect(AuthSessionSchema.safeParse(session).success).toBe(true);
      expect(session.refreshToken).toBe('r'.repeat(43));
      expect(session.user).toMatchObject({ emailVerified: false, hasPassword: true });
      expect(JSON.stringify(session)).not.toContain('passwordHash');
      expect(jwt.verify(session.accessToken)).toMatchObject({ sub: USER_ID, roles: ['TALENT'] });
    });

    it('maps a unique-email violation to CONFLICT and sends nothing', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
      );
      await expect(service.register({ ...input, role: 'CLIENT' })).rejects.toMatchObject({
        code: 'CONFLICT',
      });
      expect(mail.send).not.toHaveBeenCalled();
    });

    it('still signs the user up when the mail provider is down', async () => {
      prisma.user.create.mockResolvedValue(row);
      mail.send.mockRejectedValue(new Error('provider down'));
      const session = await service.register({ ...input, role: 'CLIENT' });
      expect(session.user.id).toBe(USER_ID);
    });

    it('puts the documents still to accept into the session user', async () => {
      consents.pendingFor.mockResolvedValue(['PRIVACY']);
      prisma.user.create.mockResolvedValue(row);
      const session = await service.register({ ...input, role: 'CLIENT' });
      expect(session.user.pendingConsents).toEqual(['PRIVACY']);
    });
  });

  describe('login', () => {
    it('rejects a wrong password and an unknown email with the same error', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        ...row,
        passwordHash: await hash('other-password', { type: argon2id }),
      });
      const wrong = service.login({ email: EMAIL, password: PASSWORD });
      await expect(wrong).rejects.toBeInstanceOf(ApiError);
      await expect(wrong).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

      prisma.user.findUnique.mockResolvedValueOnce(null);
      const unknown = service.login({ email: 'nobody@example.com', password: PASSWORD });
      await expect(unknown).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password',
      });
    });

    it('signs in an unverified user, with a refresh token', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...row,
        passwordHash: await hash(PASSWORD, { type: argon2id }),
      });
      const session = await service.login({ email: EMAIL, password: PASSWORD }, 'Mozilla/5.0');
      expect(session.user).toEqual({
        id: USER_ID,
        email: EMAIL,
        displayName: 'Anna',
        roles: ['TALENT'],
        locale: 'en',
        emailVerified: false,
        hasPassword: true,
        pendingConsents: [],
      });
      expect(session.expiresInSeconds).toBe(TTL);
      expect(tokens.issueRefresh).toHaveBeenCalledWith(USER_ID, 'Mozilla/5.0');
    });
  });

  describe('refresh', () => {
    it('returns a session built from the rotated token', async () => {
      tokens.rotate.mockResolvedValue({
        userId: USER_ID,
        token: 'n'.repeat(43),
        expiresAt: new Date('2026-11-14T00:00:00Z'),
      });
      prisma.user.findUnique.mockResolvedValue(row);
      const session = await service.refresh('old'.repeat(10));
      expect(session.refreshToken).toBe('n'.repeat(43));
      expect(session.refreshExpiresAt).toBe('2026-11-14T00:00:00.000Z');
    });

    it('answers UNAUTHENTICATED when the user no longer exists', async () => {
      tokens.rotate.mockResolvedValue({ userId: USER_ID, token: 'n', expiresAt: new Date() });
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.refresh('old'.repeat(10))).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
    });
  });

  describe('logout', () => {
    it('revokes one token, or all of the user with `all`', async () => {
      await service.logout(USER_ID, { refreshToken: 'r'.repeat(43), all: false });
      expect(tokens.revoke).toHaveBeenCalledWith(USER_ID, 'r'.repeat(43));
      expect(tokens.revokeAll).not.toHaveBeenCalled();

      await service.logout(USER_ID, { all: true });
      expect(tokens.revokeAll).toHaveBeenCalledWith(USER_ID);
    });
  });

  describe('email verification', () => {
    it('mails a link to an unverified user and nothing to a verified one', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({ ...row, emailVerifiedAt: null });
      await service.requestEmailVerification(USER_ID);
      expect(mail.send).toHaveBeenCalledTimes(1);

      prisma.user.findUnique.mockResolvedValueOnce({ ...row, emailVerifiedAt: new Date() });
      await service.requestEmailVerification(USER_ID);
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it('confirm spends the token and sets emailVerifiedAt only if it is still empty', async () => {
      const tx = { user: { updateMany: jest.fn() } };
      tokens.consumeOneTime.mockImplementation(
        (_t: string, _p: string, effect: (id: string, tx: unknown) => Promise<void>) =>
          effect(USER_ID, tx),
      );
      await service.confirmEmail('v'.repeat(43));
      expect(tokens.consumeOneTime).toHaveBeenCalledWith(
        'v'.repeat(43),
        'EMAIL_VERIFY',
        expect.any(Function),
      );
      const arg = firstCallArg(tx.user.updateMany) as {
        where: { id: string; emailVerifiedAt: null };
      };
      expect(arg.where).toEqual({ id: USER_ID, emailVerifiedAt: null });
    });
  });

  describe('password reset', () => {
    it('sends no email for an unknown address and one for a known address', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await service.requestPasswordReset('nobody@example.com');
      expect(mail.send).not.toHaveBeenCalled();
      expect(tokens.issueOneTime).not.toHaveBeenCalled();

      prisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, email: EMAIL, locale: 'ru' });
      await service.requestPasswordReset(EMAIL);
      expect(tokens.issueOneTime).toHaveBeenCalledWith(USER_ID, 'PASSWORD_RESET');
      expect(mail.send).toHaveBeenCalledTimes(1);
      expect((firstCallArg(mail.send) as { text: string }).text).toContain(
        'https://skillboard.example/ru/reset-password?token=',
      );
    });

    it('confirm stores a new hash and revokes every refresh token in the same transaction', async () => {
      const tx = { user: { update: jest.fn(), updateMany: jest.fn() } };
      tokens.consumeOneTime.mockImplementation(
        (_t: string, _p: string, effect: (id: string, tx: unknown) => Promise<void>) =>
          effect(USER_ID, tx),
      );
      await service.confirmPasswordReset('p'.repeat(43), 'New-password-1');
      const { data } = firstCallArg(tx.user.update) as { data: { passwordHash: string } };
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);
      expect(tokens.revokeAll).toHaveBeenCalledWith(USER_ID, tx);
    });

    it('confirm also verifies the email, only if it was not verified yet', async () => {
      const tx = { user: { update: jest.fn(), updateMany: jest.fn() } };
      tokens.consumeOneTime.mockImplementation(
        (_t: string, _p: string, effect: (id: string, tx: unknown) => Promise<void>) =>
          effect(USER_ID, tx),
      );
      await service.confirmPasswordReset('p'.repeat(43), 'New-password-1');
      const arg = firstCallArg(tx.user.updateMany) as {
        where: { id: string; emailVerifiedAt: null };
        data: { emailVerifiedAt: Date };
      };
      expect(arg.where).toEqual({ id: USER_ID, emailVerifiedAt: null });
      expect(arg.data.emailVerifiedAt).toBeInstanceOf(Date);
    });
  });

  describe('change password', () => {
    it('refuses a Google-only account with the NO_PASSWORD_SET reason', async () => {
      prisma.user.findUnique.mockResolvedValue({ passwordHash: null });
      const result = service.changePassword(USER_ID, {
        currentPassword: PASSWORD,
        newPassword: 'Other-password-1',
      });
      await expect(result).rejects.toMatchObject({
        code: 'FORBIDDEN',
        details: [{ code: 'NO_PASSWORD_SET' }],
      });
    });

    it('refuses a wrong current password with WRONG_PASSWORD and accepts the right one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        passwordHash: await hash(PASSWORD, { type: argon2id }),
      });
      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'wrong-pass',
          newPassword: 'Other-1!x',
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN', details: [{ code: 'WRONG_PASSWORD' }] });

      await service.changePassword(USER_ID, {
        currentPassword: PASSWORD,
        newPassword: 'Other-password-1',
        refreshToken: 'k'.repeat(43),
      });
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      // Every other session is signed out; the caller's own refresh token is the one kept.
      expect(tokens.revokeAllExcept).toHaveBeenCalledWith(USER_ID, 'k'.repeat(43), prisma);
    });
  });

  describe('Google', () => {
    const state = {
      purpose: 'oauth_state' as const,
      role: 'CLIENT' as const,
      locale: 'ru' as const,
      nonce: 'n',
    };
    const google = {
      id: 'g-1',
      email: 'Parent@Example.com',
      emailVerified: true,
      displayName: 'Parent',
    };

    it('creates a CLIENT with a linked identity, verified email and both consents', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: USER_ID });

      const outcome = await service.completeGoogle(google, state);

      expect(outcome).toEqual({ ok: true, kind: 'code', code: 't'.repeat(43) });
      const { data } = firstCallArg(prisma.user.create) as {
        data: {
          email: string;
          roles: string[];
          passwordHash: null;
          emailVerifiedAt: Date;
          locale: string;
          identities: { create: { provider: string; providerUserId: string } };
        };
      };
      expect(data).toMatchObject({
        email: 'parent@example.com',
        roles: ['CLIENT'],
        passwordHash: null,
        locale: 'ru',
        identities: { create: { provider: 'GOOGLE', providerUserId: 'g-1' } },
      });
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(consents.record).toHaveBeenCalledWith(USER_ID, ['TERMS', 'PRIVACY'], 'ru', prisma);
      expect(tokens.issueOneTime).toHaveBeenCalledWith(USER_ID, 'OAUTH_EXCHANGE');
      expect(LEGAL_VERSIONS.TERMS).toBeDefined();
    });

    it('signs in a known identity without touching users', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue({ userId: USER_ID });
      const outcome = await service.completeGoogle(google, state);
      expect(outcome.ok).toBe(true);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.authIdentity.create).not.toHaveBeenCalled();
    });

    it('links a verified account with the same email', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, emailVerifiedAt: new Date() });
      const outcome = await service.completeGoogle(google, state);
      expect(outcome.ok).toBe(true);
      expect(firstCallArg(prisma.authIdentity.create)).toEqual({
        data: { provider: 'GOOGLE', providerUserId: 'g-1', userId: USER_ID },
      });
    });

    it('refuses to link an unverified account (account takeover)', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, emailVerifiedAt: null });
      await expect(service.completeGoogle(google, state)).resolves.toEqual({
        ok: false,
        error: 'EMAIL_NOT_VERIFIED',
      });
      expect(prisma.authIdentity.create).not.toHaveBeenCalled();
      expect(tokens.issueOneTime).not.toHaveBeenCalled();
    });

    it('refuses to link when Google itself does not vouch for the address', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, emailVerifiedAt: new Date() });
      await expect(
        service.completeGoogle({ ...google, emailVerified: false }, state),
      ).resolves.toEqual({ ok: false, error: 'EMAIL_NOT_VERIFIED' });
    });

    it('fails without an email from Google', async () => {
      await expect(service.completeGoogle({ ...google, email: null }, state)).resolves.toEqual({
        ok: false,
        error: 'OAUTH_FAILED',
      });
    });

    it('signs and verifies the state, and rejects an access token or garbage', async () => {
      const { state, nonce } = await service.signOAuthState({
        role: 'TALENT',
        locale: 'ko',
        acceptTerms: 'true',
        next: '/talents',
      });
      await expect(service.verifyOAuthState(state, nonce)).resolves.toMatchObject({
        role: 'TALENT',
        locale: 'ko',
        next: '/talents',
      });

      const access = await jwt.signAsync({ sub: USER_ID, roles: ['ADMIN'] });
      await expect(service.verifyOAuthState(access, nonce)).resolves.toBeNull();
      await expect(service.verifyOAuthState('not-a-jwt', nonce)).resolves.toBeNull();
      await expect(service.verifyOAuthState(undefined, nonce)).resolves.toBeNull();
    });

    it('binds the state to the browser: a missing or different cookie nonce fails (login CSRF)', async () => {
      const { state, nonce } = await service.signOAuthState({ locale: 'en' });
      await expect(service.verifyOAuthState(state, undefined)).resolves.toBeNull();
      await expect(service.verifyOAuthState(state, `${nonce}x`)).resolves.toBeNull();
      await expect(service.verifyOAuthState(state, nonce)).resolves.not.toBeNull();
    });

    it('creates nothing for an unknown Google user who has not chosen a role yet', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      const outcome = await service.completeGoogle(google, {
        purpose: 'oauth_state',
        locale: 'ru',
        nonce: 'n',
      });
      expect(outcome).toEqual({ ok: true, kind: 'signup', signupToken: 'opaque-signup-token' });
      expect(tokens.issueOAuthSignup).toHaveBeenCalledWith(
        expect.objectContaining({
          providerUserId: 'g-1',
          email: 'parent@example.com',
          locale: 'ru',
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(consents.record).not.toHaveBeenCalled();
      expect(tokens.issueOneTime).not.toHaveBeenCalled();
      // The identity is parked in the database: neither the email nor the name is in the token.
      expect(JSON.stringify(outcome)).not.toContain('example.com');
    });

    it('still signs in a known Google identity that started on the sign-in page', async () => {
      prisma.authIdentity.findUnique.mockResolvedValue({ userId: USER_ID });
      const outcome = await service.completeGoogle(google, {
        purpose: 'oauth_state',
        locale: 'ru',
        nonce: 'n',
      });
      expect(outcome).toMatchObject({ ok: true, kind: 'code' });
    });

    it('role step: creates the chosen role with both consents from the parked identity', async () => {
      tokens.consumeOAuthSignup.mockImplementation(
        (_token: string, effect: (identity: unknown, tx: unknown) => Promise<string>) =>
          effect(
            {
              providerUserId: 'g-1',
              email: 'parent@example.com',
              emailVerified: true,
              displayName: 'Parent',
              locale: 'en',
            },
            prisma,
          ),
      );
      prisma.user.create.mockResolvedValue({ id: USER_ID });
      prisma.user.findUnique.mockResolvedValue(row);

      const session = await service.completeGoogleSignup({
        signupToken: 'opaque-signup-token-value',
        role: 'TALENT',
        locale: 'ko',
        acceptTerms: true,
      });

      expect(session.user.id).toBe(USER_ID);
      const { data } = firstCallArg(prisma.user.create) as {
        data: { email: string; roles: string[]; locale: string; passwordHash: null };
      };
      expect(data).toMatchObject({
        email: 'parent@example.com',
        roles: ['TALENT'],
        locale: 'ko',
        passwordHash: null,
      });
      expect(consents.record).toHaveBeenCalledWith(USER_ID, ['TERMS', 'PRIVACY'], 'ko', prisma);
    });

    it('role step: an unknown token is NOT_FOUND and an existing account is CONFLICT', async () => {
      const input = {
        signupToken: 'opaque-signup-token-value',
        role: 'CLIENT' as const,
        locale: 'en' as const,
        acceptTerms: true as const,
      };
      tokens.consumeOAuthSignup.mockRejectedValueOnce(new ApiError('NOT_FOUND', 'x'));
      await expect(service.completeGoogleSignup(input)).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });

      tokens.consumeOAuthSignup.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
      );
      await expect(service.completeGoogleSignup(input)).rejects.toMatchObject({
        code: 'CONFLICT',
      });
    });

    it('redirect parameters echo the web nonce and keep next, for every outcome', () => {
      const state = {
        purpose: 'oauth_state' as const,
        locale: 'en' as const,
        nonce: 'n',
        next: '/talents',
        webNonce: 'w'.repeat(22),
      };
      const n = 'w'.repeat(22);
      expect(service.googleRedirectParams({ ok: true, kind: 'code', code: 'c' }, state)).toEqual({
        code: 'c',
        next: '/talents',
        n,
      });
      expect(
        service.googleRedirectParams({ ok: true, kind: 'signup', signupToken: 's' }, state),
      ).toEqual({ signup: 's', next: '/talents', n });
      expect(
        service.googleRedirectParams({ ok: false, error: 'EMAIL_NOT_VERIFIED' }, state),
      ).toEqual({ error: 'EMAIL_NOT_VERIFIED', next: '/talents', n });
      expect(
        service.googleRedirectParams(
          { ok: true, kind: 'code', code: 'c' },
          { purpose: 'oauth_state', locale: 'en', nonce: 'n' },
        ),
      ).toEqual({ code: 'c' });
    });

    it('exchange spends the code and starts a session', async () => {
      tokens.consumeOneTime.mockResolvedValue(USER_ID);
      prisma.user.findUnique.mockResolvedValue(row);
      const session = await service.exchange('c'.repeat(43));
      expect(session.user.id).toBe(USER_ID);
      expect(tokens.consumeOneTime).toHaveBeenCalledWith(
        'c'.repeat(43),
        'OAUTH_EXCHANGE',
        expect.any(Function),
      );
    });

    it('reports Google as enabled only when all three variables are set', () => {
      expect(service.googleEnabled()).toBe(true);
    });
  });

  describe('logging (rule 11)', () => {
    it('writes no email, token or password into any log call of sign-up, verification and reset', async () => {
      const { Logger } = await import('@nestjs/common');
      const spies = (['log', 'warn', 'error'] as const).map((level) =>
        jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
      );
      const token = 'secret-token-value-'.repeat(2);
      tokens.issueOneTime.mockResolvedValue(token);

      prisma.user.create.mockResolvedValue(row);
      await service.register({ ...input, role: 'TALENT' });
      prisma.user.findUnique.mockResolvedValueOnce({ id: USER_ID, email: EMAIL, locale: 'en' });
      await service.requestPasswordReset(EMAIL);
      const tx = { user: { updateMany: jest.fn(), update: jest.fn() } };
      tokens.consumeOneTime.mockImplementation(
        (_t: string, _p: string, effect: (id: string, tx: unknown) => Promise<void>) =>
          effect(USER_ID, tx),
      );
      await service.confirmEmail(token);
      await service.confirmPasswordReset(token, PASSWORD);
      mail.send.mockRejectedValueOnce(new Error(`failed for ${EMAIL}`));
      prisma.user.findUnique.mockResolvedValueOnce({ ...row, emailVerifiedAt: null });
      await service.requestEmailVerification(USER_ID);

      const logged = spies.flatMap((spy) => spy.mock.calls.map((call) => JSON.stringify(call)));
      expect(logged.length).toBeGreaterThan(0);
      for (const line of logged) {
        expect(line).not.toContain(EMAIL);
        expect(line).not.toContain(token);
        expect(line).not.toContain(PASSWORD);
      }
      for (const spy of spies) spy.mockRestore();
    });
  });
});
