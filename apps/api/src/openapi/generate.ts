/**
 * Writes apps/api/openapi.json. Run from the repo root with `pnpm api-client:generate`,
 * which also regenerates packages/api-client. CI fails if the committed files are stale.
 * The app is created but never listens; Prisma connects lazily, so no database is needed.
 */
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { buildOpenApiDocument, setupApp } from '../setup-app.js';

process.env.DATABASE_URL ??= 'postgresql://openapi:openapi@localhost:5432/openapi';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  setupApp(app);
  const doc = buildOpenApiDocument(app);
  const out = resolve(process.cwd(), 'openapi.json');
  writeFileSync(out, `${JSON.stringify(doc, null, 2)}\n`);
  await app.close();
  console.warn(`OpenAPI written to ${out}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
