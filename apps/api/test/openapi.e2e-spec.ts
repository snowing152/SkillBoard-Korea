import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { buildOpenApiDocument, setupApp } from '../src/setup-app.js';

/**
 * Guards the generated contract itself. Regression for docs/pitfalls.md: nestjs-zod turned a bare
 * `z.string().nullable()` into `{ type: 'array', items: { type: 'string' } }`, which made the typed
 * client believe `nextCursor` was `string[]`.
 */
describe('OpenAPI document (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('emits nullable scalars as nullable scalars, never as arrays', () => {
    const doc = buildOpenApiDocument(app);
    const schemas = doc.components?.schemas ?? {};
    const list = schemas.TalentCardListDto as { properties: Record<string, unknown> } | undefined;
    expect(list?.properties.nextCursor).toMatchObject({ type: 'string', nullable: true });

    const offenders: string[] = [];
    for (const [name, schema] of Object.entries(schemas)) {
      const properties = (schema as { properties?: Record<string, unknown> }).properties ?? {};
      for (const [prop, value] of Object.entries(properties)) {
        const json = JSON.stringify(value);
        if (json.includes('x-nestjs_zod')) offenders.push(`${name}.${prop}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
