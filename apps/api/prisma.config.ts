// Prisma 7: the datasource URL lives here, not in schema.prisma (ADR 0005).
// The CLI does not load .env by itself anymore, hence the dotenv import.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
