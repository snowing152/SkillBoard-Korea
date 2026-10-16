// Loaded by jest.e2e.config.cjs before every e2e file. Needs the Docker Postgres from `pnpm db:up`
// (ADR 0011) or the CI service container. Values here are defaults; a real .env wins.
import 'dotenv/config';

import { TEST_E2E_ACCESS_SECRET, TEST_E2E_REFRESH_PEPPER } from './fixtures/credentials.js';
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://skillboard:skillboard@localhost:5432/skillboard';
process.env.JWT_ACCESS_SECRET ??= TEST_E2E_ACCESS_SECRET;
process.env.JWT_REFRESH_PEPPER ??= TEST_E2E_REFRESH_PEPPER;
