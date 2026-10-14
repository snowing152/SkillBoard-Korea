import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorResponseSchema, HealthResponseSchema } from '@skillboard/shared';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';

// Needs the Docker Postgres from `pnpm db:up` (ADR 0011) or the CI service container.
process.env.DATABASE_URL ??= 'postgresql://skillboard:skillboard@localhost:5432/skillboard';
process.env.NODE_ENV ??= 'test';

describe('GET /v1/health (e2e)', () => {
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    // getHttpServer() is typed `any` by Nest; narrow it once here.
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the health shape with the database up', async () => {
    const res = await request(server).get('/v1/health').expect(200);
    const parsed = HealthResponseSchema.parse(res.body);
    expect(parsed.checks.database).toBe('up');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns the canonical error shape for unknown routes', async () => {
    const res = await request(server)
      .get('/v1/does-not-exist')
      .set('x-request-id', 'test-req-1')
      .expect(404);
    const parsed = ErrorResponseSchema.parse(res.body);
    expect(parsed.error.code).toBe('NOT_FOUND');
    expect(parsed.requestId).toBe('test-req-1');
  });
});
