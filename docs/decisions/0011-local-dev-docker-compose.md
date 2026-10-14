# 0011. Local dev: Docker Compose for PostgreSQL, seed script

Date: 2026-10-14 · Status: Accepted

## Context

An agent must be able to run the entire app alone, and test search without creating data by hand.

## Decision

`docker-compose.yml` at the root runs Postgres 17 on port 5432 and RustFS (S3-compatible, for photo uploads;
MinIO's public images were withdrawn) on ports 9000/9001, with named volumes. Apps run on the host
(`pnpm dev`), not in containers, for fast reloads. `pnpm db:reset` = `prisma migrate reset --force` + seed
(`prisma.config.ts` → `migrations.seed`). Prisma blocks this command for AI agents; a human runs it.
Seed (`apps/api/prisma/seed.ts`) creates: skill categories and skills for the launch niche (tutoring,
marketing/SMM, content & video, translation/interpreting), ~30 talent profiles across Seoul/Busan/Incheon/
Daegu, Russian/English/Korean/Uzbek speakers, mixed visa types, one admin, one client, and a few reports.
Seed data is deterministic (fixed ids via a seeded faker) so e2e tests can rely on it.

## Consequences

The Stop hook / `pnpm check` must not need Docker (unit tests mock Prisma); only API e2e and Playwright do.
`.env.example` files are committed; `.env` files never are.
