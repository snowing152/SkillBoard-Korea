import './env-refresh-grace-zero.js';
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthSessionSchema,
  AuthUserSchema,
  ErrorResponseSchema,
  MyTalentProfileSchema,
  SkillCatalogSchema,
  TalentCardListSchema,
} from '@skillboard/shared';
import { TEST_NEW_PASSWORD, TEST_PASSWORD, TEST_WRONG_PASSWORD } from './fixtures/credentials.js';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { MailPort, type MailMessage } from '../src/common/mail/mail.port.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { TokensService } from '../src/modules/auth/tokens.service.js';
import { setupApp } from '../src/setup-app.js';

const EMAILS = {
  main: 'e2e-auth@skillboard.local',
  google: 'e2e-auth-google@skillboard.local',
  googleNew: 'e2e-auth-google-new@skillboard.local',
  unknown: 'e2e-auth-nobody@skillboard.local',
};
const PASSWORD = TEST_PASSWORD;
const NEW_PASSWORD = TEST_NEW_PASSWORD;

describe('auth and accounts (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  const outbox: MailMessage[] = [];

  const cleanup = () => prisma.user.deleteMany({ where: { email: { in: Object.values(EMAILS) } } });
  const lastToken = () => {
    const text = outbox[outbox.length - 1]?.text ?? '';
    return /token=([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? '';
  };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const login = (password: string) =>
    request(server).post('/v1/auth/login').send({ email: EMAILS.main, password });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailPort)
      .useValue({
        send: (message: MailMessage) => {
          outbox.push(message);
          return Promise.resolve();
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    server = app.getHttpServer() as App;
    prisma = app.get(PrismaService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  let access = '';
  let refresh = '';
  let userId = '';

  it('answers the public routes without a token', async () => {
    const bad = await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: 'x'.repeat(43) })
      .expect(401);
    expect(ErrorResponseSchema.parse(bad.body).error.code).toBe('UNAUTHENTICATED');

    const exchange = await request(server)
      .post('/v1/auth/exchange')
      .send({ code: 'x'.repeat(43) })
      .expect(404);
    expect(ErrorResponseSchema.parse(exchange.body).error.code).toBe('NOT_FOUND');

    await request(server)
      .post('/v1/auth/verify-email/confirm')
      .send({ token: 'x'.repeat(43) })
      .expect(404);

    // No account enumeration: an unknown address gets the same 204 and no mail.
    await request(server)
      .post('/v1/auth/password-reset/request')
      .send({ email: EMAILS.unknown })
      .expect(204);
    expect(outbox).toHaveLength(0);

    if (!process.env.GOOGLE_CLIENT_ID) {
      const res = await request(server)
        .get('/v1/auth/google?role=CLIENT&locale=en&acceptTerms=true')
        .expect(404);
      expect(ErrorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
    }
  });

  it('rejects the private routes without a token', async () => {
    for (const res of [
      await request(server).get('/v1/me').expect(401),
      await request(server).patch('/v1/me').send({}).expect(401),
      await request(server).post('/v1/me/password').send({}).expect(401),
      await request(server).post('/v1/auth/logout').send({}).expect(401),
      await request(server).post('/v1/auth/verify-email/request').expect(401),
    ]) {
      expect(ErrorResponseSchema.parse(res.body).error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('refuses a sign-up without the consent box and a duplicate email', async () => {
    const base = {
      email: EMAILS.main,
      password: PASSWORD,
      displayName: 'E2E Auth',
      role: 'TALENT',
    };
    const res = await request(server).post('/v1/auth/register').send(base).expect(400);
    expect(ErrorResponseSchema.parse(res.body).error.details?.[0]?.path).toEqual(['acceptTerms']);
  });

  it('registers, mails one verification link and starts an unverified session', async () => {
    const res = await request(server)
      .post('/v1/auth/register')
      .send({
        email: EMAILS.main,
        password: PASSWORD,
        displayName: 'E2E Auth',
        role: 'TALENT',
        locale: 'ko',
        acceptTerms: true,
      })
      .expect(201);
    const session = AuthSessionSchema.parse(res.body);
    expect(session.user).toMatchObject({ emailVerified: false, hasPassword: true, locale: 'ko' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    access = session.accessToken;
    refresh = session.refreshToken;
    userId = session.user.id;

    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.to).toBe(EMAILS.main);
    expect(outbox[0]?.text).toContain('/ko/verify-email?token=');

    await request(server)
      .post('/v1/auth/register')
      .send({
        email: EMAILS.main,
        password: PASSWORD,
        displayName: 'E2E Auth',
        role: 'TALENT',
        acceptTerms: true,
      })
      .expect(409);
  });

  it('keeps a published profile hidden until the email is verified, then shows it live', async () => {
    const catalog = SkillCatalogSchema.parse(
      (await request(server).get('/v1/skills').expect(200)).body,
    );
    const skillId = catalog.categories[0]?.skills[0]?.id ?? '';
    const created = await request(server)
      .post('/v1/me/talent-profile')
      .set(bearer(access))
      .send({
        headline: 'E2E auth tutor',
        description: 'Created by the auth e2e test to prove the verification gate on visibility.',
        cityCode: 'SEOUL',
        workMode: 'REMOTE',
        visaType: 'F-4',
        videoUrl: null,
        skillIds: [skillId],
        languages: [{ languageCode: 'ru', level: 'NATIVE' }],
        portfolioLinks: [],
        contactMethods: [{ type: 'TELEGRAM', value: '@e2eauth' }],
        acknowledgeVisaDisclaimer: true,
      })
      .expect(201);
    const slug = MyTalentProfileSchema.parse(created.body).slug;
    await request(server)
      .patch('/v1/me/talent-profile')
      .set(bearer(access))
      .send({ status: 'PUBLISHED' })
      .expect(200);

    await request(server).get(`/v1/talents/${slug}`).expect(404);
    const before = TalentCardListSchema.parse(
      (await request(server).get('/v1/talents?limit=50').expect(200)).body,
    );
    expect(before.items.some((i) => i.slug === slug)).toBe(false);

    await request(server)
      .post('/v1/auth/verify-email/confirm')
      .send({ token: lastToken() })
      .expect(204);

    await request(server).get(`/v1/talents/${slug}`).expect(200);
    const after = TalentCardListSchema.parse(
      (await request(server).get('/v1/talents?limit=50').expect(200)).body,
    );
    expect(after.items.some((i) => i.slug === slug)).toBe(true);

    const me = AuthUserSchema.parse(
      (await request(server).get('/v1/me').set(bearer(access)).expect(200)).body,
    );
    expect(me.emailVerified).toBe(true);

    // The same link twice: the second is NOT_FOUND.
    await request(server)
      .post('/v1/auth/verify-email/confirm')
      .send({ token: outbox[0] ? /token=([A-Za-z0-9_-]+)/.exec(outbox[0].text)?.[1] : '' })
      .expect(404);
  });

  it('rotates the refresh token and treats a reused one as theft', async () => {
    const first = AuthSessionSchema.parse(
      (await request(server).post('/v1/auth/refresh').send({ refreshToken: refresh }).expect(200))
        .body,
    );
    expect(first.refreshToken).not.toBe(refresh);

    // The old token is replayed: 401 and the whole family dies, including the fresh token.
    await request(server).post('/v1/auth/refresh').send({ refreshToken: refresh }).expect(401);
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    expect(
      await prisma.refreshToken.count({ where: { userId, revokedAt: null, rotatedAt: null } }),
    ).toBe(0);
  });

  it('logs out one device and refuses its refresh token afterwards', async () => {
    const session = AuthSessionSchema.parse((await login(PASSWORD).expect(200)).body);
    await request(server)
      .post('/v1/auth/logout')
      .set(bearer(session.accessToken))
      .send({ refreshToken: session.refreshToken })
      .expect(204);
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(401);
  });

  it('updates the display name and language, and changes the password', async () => {
    const session = AuthSessionSchema.parse((await login(PASSWORD).expect(200)).body);
    const headers = bearer(session.accessToken);

    const patched = AuthUserSchema.parse(
      (
        await request(server)
          .patch('/v1/me')
          .set(headers)
          .send({ displayName: 'E2E Renamed', locale: 'ru' })
          .expect(200)
      ).body,
    );
    expect(patched).toMatchObject({ displayName: 'E2E Renamed', locale: 'ru' });
    const me = AuthUserSchema.parse(
      (await request(server).get('/v1/me').set(headers).expect(200)).body,
    );
    expect(me.locale).toBe('ru');

    const wrong = await request(server)
      .post('/v1/me/password')
      .set(headers)
      .send({ currentPassword: TEST_WRONG_PASSWORD, newPassword: NEW_PASSWORD })
      .expect(403);
    expect(ErrorResponseSchema.parse(wrong.body).error.details?.[0]?.code).toBe('WRONG_PASSWORD');

    await request(server)
      .post('/v1/me/password')
      .set(headers)
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
      .expect(204);
    await login(PASSWORD).expect(401);
    await login(NEW_PASSWORD).expect(200);

    // Put it back for the reset test below.
    await request(server)
      .post('/v1/me/password')
      .set(headers)
      .send({ currentPassword: NEW_PASSWORD, newPassword: PASSWORD })
      .expect(204);
  });

  it('resets a forgotten password and signs every device out', async () => {
    const signedIn = AuthSessionSchema.parse((await login(PASSWORD).expect(200)).body);
    const mailsBefore = outbox.length;

    await request(server)
      .post('/v1/auth/password-reset/request')
      .send({ email: EMAILS.main })
      .expect(204);
    // The reset mail is sent off the request path (no timing oracle), so wait for it briefly.
    for (let i = 0; i < 50 && outbox.length === mailsBefore; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(outbox).toHaveLength(mailsBefore + 1);
    expect(outbox[mailsBefore]?.text).toContain('/ru/reset-password?token=');
    const token = lastToken();

    await request(server)
      .post('/v1/auth/password-reset/confirm')
      .send({ token, password: NEW_PASSWORD })
      .expect(204);

    await login(PASSWORD).expect(401);
    await login(NEW_PASSWORD).expect(200);
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: signedIn.refreshToken })
      .expect(401);
    // The link is single-use.
    await request(server)
      .post('/v1/auth/password-reset/confirm')
      .send({ token, password: PASSWORD })
      .expect(404);
  });

  it('throttles the reset mail: the fourth request in 15 minutes answers 429', async () => {
    // Earlier tests already spent two of the three allowed requests from this IP.
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      const res = await request(server)
        .post('/v1/auth/password-reset/request')
        .send({ email: EMAILS.unknown });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([204, 429, 429]);
    const limited = await request(server)
      .post('/v1/auth/password-reset/request')
      .send({ email: EMAILS.unknown });
    expect(ErrorResponseSchema.parse(limited.body).error.code).toBe('RATE_LIMITED');
  });

  it('creates a Google CLIENT through the exchange code, verified and with both consents', async () => {
    const auth = app.get(AuthService);
    const outcome = await auth.completeGoogle(
      { id: 'e2e-google-sub-1', email: EMAILS.google, emailVerified: true, displayName: 'Parent' },
      { purpose: 'oauth_state', role: 'CLIENT', locale: 'en', nonce: 'e2e' },
    );
    if (!outcome.ok || outcome.kind !== 'code') throw new Error('expected an exchange code');

    const res = await request(server)
      .post('/v1/auth/exchange')
      .send({ code: outcome.code })
      .expect(200);
    const session = AuthSessionSchema.parse(res.body);
    expect(session.user).toMatchObject({
      roles: ['CLIENT'],
      emailVerified: true,
      hasPassword: false,
      pendingConsents: [],
    });
    expect(await prisma.authIdentity.count({ where: { userId: session.user.id } })).toBe(1);

    // The same Google user, starting from /sign-in, is simply signed in: no role step.
    const again = await auth.completeGoogle(
      { id: 'e2e-google-sub-1', email: EMAILS.google, emailVerified: true, displayName: 'Parent' },
      { purpose: 'oauth_state', locale: 'en', nonce: 'e2e' },
    );
    expect(again).toMatchObject({ ok: true, kind: 'code' });

    // A code issued before a revocation (password reset or change, logout everywhere) is void.
    const stale = await auth.completeGoogle(
      { id: 'e2e-google-sub-1', email: EMAILS.google, emailVerified: true, displayName: 'Parent' },
      { purpose: 'oauth_state', locale: 'en', nonce: 'e2e' },
    );
    if (!stale.ok || stale.kind !== 'code') throw new Error('expected an exchange code');
    await app.get(TokensService).revokeAll(session.user.id);
    await request(server).post('/v1/auth/exchange').send({ code: stale.code }).expect(404);

    // The code is single-use.
    await request(server).post('/v1/auth/exchange').send({ code: outcome.code }).expect(404);

    // A Google-only account cannot change a password it does not have.
    const denied = await request(server)
      .post('/v1/me/password')
      .set(bearer(session.accessToken))
      .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
      .expect(403);
    expect(ErrorResponseSchema.parse(denied.body).error.details?.[0]?.code).toBe('NO_PASSWORD_SET');
  });

  it('sends an unknown Google user to the role step and creates the account only after it', async () => {
    const auth = app.get(AuthService);
    const profile = {
      id: 'e2e-google-sub-2',
      email: EMAILS.googleNew,
      emailVerified: true,
      displayName: 'Newcomer',
    };
    const outcome = await auth.completeGoogle(profile, {
      purpose: 'oauth_state',
      locale: 'ko',
      nonce: 'e2e',
    });
    if (!outcome.ok || outcome.kind !== 'signup') throw new Error('expected the role step');
    expect(await prisma.user.count({ where: { email: EMAILS.googleNew } })).toBe(0);

    const body = { signupToken: outcome.signupToken, role: 'TALENT', locale: 'ko' };
    await request(server)
      .post('/v1/auth/google/complete')
      .send({ ...body, acceptTerms: false })
      .expect(400);
    expect(await prisma.user.count({ where: { email: EMAILS.googleNew } })).toBe(0);

    const res = await request(server)
      .post('/v1/auth/google/complete')
      .send({ ...body, acceptTerms: true })
      .expect(200);
    const session = AuthSessionSchema.parse(res.body);
    expect(session.user).toMatchObject({
      roles: ['TALENT'],
      locale: 'ko',
      emailVerified: true,
      pendingConsents: [],
    });

    // Single use: the parked identity is gone, so the token cannot be replayed at all.
    await request(server)
      .post('/v1/auth/google/complete')
      .send({ ...body, acceptTerms: true })
      .expect(404);
    await request(server)
      .post('/v1/auth/google/complete')
      .send({ ...body, signupToken: 'x'.repeat(43), acceptTerms: true })
      .expect(404);
  });

  it('a password change signs out every other device and keeps the current one', async () => {
    const here = AuthSessionSchema.parse((await login(NEW_PASSWORD).expect(200)).body);
    const elsewhere = AuthSessionSchema.parse((await login(NEW_PASSWORD).expect(200)).body);

    await request(server)
      .post('/v1/me/password')
      .set(bearer(here.accessToken))
      .send({
        currentPassword: NEW_PASSWORD,
        newPassword: PASSWORD,
        refreshToken: here.refreshToken,
      })
      .expect(204);

    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: elsewhere.refreshToken })
      .expect(401);
    await request(server)
      .post('/v1/auth/refresh')
      .send({ refreshToken: here.refreshToken })
      .expect(200);
  });
});
