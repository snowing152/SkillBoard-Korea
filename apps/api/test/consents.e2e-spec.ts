import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthSessionSchema,
  ConsentListSchema,
  ErrorResponseSchema,
  LEGAL_VERSIONS,
} from '@skillboard/shared';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

const EMAIL = 'e2e-consents@skillboard.local';

describe('consents (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let token = '';
  let userId = '';

  const cleanup = () => prisma.user.deleteMany({ where: { email: EMAIL } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  it('rejects both routes without a token', async () => {
    for (const res of [
      await request(server).get('/v1/me/consents').expect(401),
      await request(server).post('/v1/me/consents').send({}).expect(401),
    ]) {
      expect(ErrorResponseSchema.parse(res.body).error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('records terms and privacy at sign-up, in the language of the sign-up page', async () => {
    const reg = await request(server)
      .post('/v1/auth/register')
      .send({
        email: EMAIL,
        password: 'Password123!',
        displayName: 'E2E Consent',
        role: 'CLIENT',
        locale: 'ru',
        acceptTerms: true,
      })
      .expect(201);
    const session = AuthSessionSchema.parse(reg.body);
    token = session.accessToken;
    userId = session.user.id;
    expect(session.user.pendingConsents).toEqual([]);

    const res = await request(server)
      .get('/v1/me/consents')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const list = ConsentListSchema.parse(res.body);
    expect(list.items.map((i) => i.type).sort()).toEqual(['PRIVACY', 'TERMS']);
    expect(list.items.every((i) => i.locale === 'ru')).toBe(true);
    expect(list.pending).toEqual([]);
  });

  it('accepting the current versions again is a no-op that keeps the first language', async () => {
    const accept = () =>
      request(server)
        .post('/v1/me/consents')
        .set('Authorization', `Bearer ${token}`)
        .send({ documents: ['TERMS', 'PRIVACY'], locale: 'ru' })
        .expect(200);
    const list = ConsentListSchema.parse((await accept()).body);
    expect(list.pending).toEqual([]);
    expect(list.items).toHaveLength(2);
    expect(list.items.find((i) => i.type === 'PRIVACY')).toMatchObject({
      version: LEGAL_VERSIONS.PRIVACY,
      locale: 'ru',
    });

    await accept();
    expect(await prisma.consent.count({ where: { userId } })).toBe(2);
  });

  it('asks again when a stored version is outdated and keeps the old row', async () => {
    await prisma.consent.updateMany({
      where: { userId, type: 'PRIVACY' },
      data: { version: '2020-01-01' },
    });
    const before = ConsentListSchema.parse(
      (
        await request(server)
          .get('/v1/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body,
    );
    expect(before.pending).toEqual(['PRIVACY']);

    await request(server)
      .post('/v1/me/consents')
      .set('Authorization', `Bearer ${token}`)
      .send({ documents: ['PRIVACY'], locale: 'en' })
      .expect(200);
    const versions = (await prisma.consent.findMany({ where: { userId, type: 'PRIVACY' } }))
      .map((c) => c.version)
      .sort();
    expect(versions).toEqual(['2020-01-01', LEGAL_VERSIONS.PRIVACY]);
  });

  it('rejects an unknown document with the validation error shape', async () => {
    const res = await request(server)
      .post('/v1/me/consents')
      .set('Authorization', `Bearer ${token}`)
      .send({ documents: ['COOKIES'], locale: 'en' })
      .expect(400);
    expect(ErrorResponseSchema.parse(res.body).error.code).toBe('VALIDATION_FAILED');
  });
});
