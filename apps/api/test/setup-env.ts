// Loaded by jest.e2e.config.cjs before every e2e file. Needs the Docker Postgres from `pnpm db:up`
// (ADR 0011) or the CI service container. Values here are defaults; a real .env wins.
import 'dotenv/config';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://skillboard:skillboard@localhost:5432/skillboard';
process.env.JWT_ACCESS_SECRET ??= 'e2e-only-secret-not-used-anywhere-else-0123456789';
