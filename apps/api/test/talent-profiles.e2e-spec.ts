import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthSessionSchema,
  ConsentListSchema,
  ErrorResponseSchema,
  LEGAL_VERSIONS,
  MyTalentProfileSchema,
  SkillCatalogSchema,
  TalentCardListSchema,
  TalentProfileSchema,
} from '@skillboard/shared';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/common/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

// Fixed email, deleted before and after, so the test is repeatable without a seed reset.
const EMAIL = 'e2e-talent@skillboard.local';
const PASSWORD = 'Password123!';

const body = (skillId: string) => ({
  headline: 'E2E Russian tutor',
  description: 'Created by the API e2e test to prove the create, publish and read path.',
  cityCode: 'SEOUL',
  workMode: 'REMOTE',
  visaType: 'F-4',
  videoUrl: null,
  skillIds: [skillId],
  languages: [{ languageCode: 'ru', level: 'NATIVE' }],
  portfolioLinks: [{ url: 'https://example.com', label: 'Site' }],
  contactMethods: [{ type: 'TELEGRAM', value: '@e2e' }],
  acknowledgeVisaDisclaimer: true,
});

describe('talent profiles (e2e)', () => {
  let app: INestApplication;
  let server: App;
  let prisma: PrismaService;
  let token = '';
  let slug = '';
  let skillId = '';

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

  it('registers a talent and returns a session', async () => {
    const res = await request(server)
      .post('/v1/auth/register')
      .send({
        email: EMAIL,
        password: PASSWORD,
        displayName: 'E2E Talent',
        role: 'TALENT',
        acceptTerms: true,
      })
      .expect(201);
    const session = AuthSessionSchema.parse(res.body);
    expect(session.user.email).toBe(EMAIL);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    token = session.accessToken;
  });

  it('rejects the owner routes without a token in the canonical error shape', async () => {
    const res = await request(server).get('/v1/me/talent-profile').expect(401);
    expect(ErrorResponseSchema.parse(res.body).error.code).toBe('UNAUTHENTICATED');
  });

  it('creates a draft profile with a skill from the catalog', async () => {
    const catalog = SkillCatalogSchema.parse(
      (await request(server).get('/v1/skills').expect(200)).body,
    );
    skillId = catalog.categories[0]?.skills[0]?.id ?? '';
    expect(skillId).not.toBe('');

    const res = await request(server)
      .post('/v1/me/talent-profile')
      .set('Authorization', `Bearer ${token}`)
      .send(body(skillId))
      .expect(201);
    const profile = MyTalentProfileSchema.parse(res.body);
    expect(profile.status).toBe('DRAFT');
    expect(profile.contactMethods).toHaveLength(1);

    // The acknowledged disclaimer is recorded as a consent at the current version.
    const consents = ConsentListSchema.parse(
      (
        await request(server)
          .get('/v1/me/consents')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      ).body,
    );
    expect(consents.items).toContainEqual(
      expect.objectContaining({
        type: 'VISA_DISCLAIMER',
        version: LEGAL_VERSIONS.VISA_DISCLAIMER,
        locale: 'en',
      }),
    );
    slug = profile.slug;
  });

  it('answers CONFLICT on a second create (validation runs first, so the body must be valid)', async () => {
    const res = await request(server)
      .post('/v1/me/talent-profile')
      .set('Authorization', `Bearer ${token}`)
      .send(body(skillId))
      .expect(409);
    expect(ErrorResponseSchema.parse(res.body).error.code).toBe('CONFLICT');
  });

  it('hides a draft, and a published profile until the email is verified, then shows it without contacts', async () => {
    await request(server).get(`/v1/talents/${slug}`).expect(404);

    const updated = await request(server)
      .patch('/v1/me/talent-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PUBLISHED' })
      .expect(200);
    expect(MyTalentProfileSchema.parse(updated.body).publishedAt).not.toBeNull();

    // Published but the owner never verified the email: still invisible (accounts spec).
    await request(server).get(`/v1/talents/${slug}`).expect(404);
    await prisma.user.update({ where: { email: EMAIL }, data: { emailVerifiedAt: new Date() } });

    const res = await request(server).get(`/v1/talents/${slug}`).expect(200);
    const profile = TalentProfileSchema.parse(res.body);
    expect(profile.headline).toBe('E2E Russian tutor');
    expect(res.body).not.toHaveProperty('contactMethods');

    const list = TalentCardListSchema.parse(
      (await request(server).get('/v1/talents?limit=5').expect(200)).body,
    );
    expect(list.items.some((item) => item.slug === slug)).toBe(true);
  });

  it('returns VALIDATION_FAILED with field details for a bad body', async () => {
    const res = await request(server)
      .patch('/v1/me/talent-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ headline: 'ab' })
      .expect(400);
    const parsed = ErrorResponseSchema.parse(res.body);
    expect(parsed.error.code).toBe('VALIDATION_FAILED');
    expect(parsed.error.details?.[0]?.path).toEqual(['headline']);
  });
});
