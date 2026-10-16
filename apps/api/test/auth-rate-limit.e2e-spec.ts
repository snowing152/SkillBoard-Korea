import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorResponseSchema } from '@skillboard/shared';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';

/**
 * The auth routes allow 10 requests per minute per IP (ADR 0018). A fresh app instance has a fresh
 * limiter, so this file counts from zero and cannot be disturbed by the other e2e files.
 */
describe('auth rate limit (e2e)', () => {
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 RATE_LIMITED on the eleventh login attempt within a minute', async () => {
    const attempt = () =>
      request(server)
        .post('/v1/auth/login')
        .send({ email: 'nobody-rate-limit@skillboard.local', password: 'Password123!' });

    for (let i = 0; i < 10; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    const limited = await attempt();
    expect(limited.status).toBe(429);
    expect(ErrorResponseSchema.parse(limited.body).error.code).toBe('RATE_LIMITED');
  });
});
