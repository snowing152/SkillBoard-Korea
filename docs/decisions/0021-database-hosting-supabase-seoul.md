# 0021. Database hosting: Supabase free tier in Seoul instead of Neon Singapore

Date: 2026-10-14 · Status: Accepted · Supersedes the DB row of 0013

## Context

ADR 0013 chose Neon (Singapore) because it never pauses. Checked on 2026-10-14: Neon's free tier offers
no Korean region (N. Virginia, Ohio, Oregon, Frankfurt, Singapore, Sydney only). Supabase offers
Northeast Asia (Seoul, `ap-northeast-2`) on the free plan, but pauses a project after 7 days without
activity and caps the database at 500 MB. Keeping personal data of people in Korea inside Korea
simplifies the PIPA overseas-transfer disclosure and lowers latency for Korean users.

## Decision

- PostgreSQL runs on **Supabase free, Seoul region**. Only the Postgres database is used: no Supabase
  Auth, Storage or client SDK, so nothing in code knows the host (rule 7, `DATABASE_URL` only).
- `DATABASE_URL` is the Supavisor pooled connection (port 6543, `pgbouncer=true`) for the running API;
  `DIRECT_DATABASE_URL` (port 5432) is used by `prisma.config.ts` for migrations. Both are env variables.
- The pause problem is solved by the daily GitHub Actions job of ADR 0022 (account purge): it calls the
  API every day, which queries the database, so the project never reaches 7 idle days. The same call
  wakes the sleeping Render API once a day.
- The API stays on Render Singapore (Render has no Korean region); about 70 ms API-to-DB latency is
  accepted for MVP.

## Consequences

The privacy policy no longer lists the database as overseas storage; Vercel, Render, Resend, Google
sign-in and Cloudflare R2 still are. If the daily job ever stops (workflow disabled, secret rotated),
the project pauses and the first request fails until someone un-pauses it in the Supabase dashboard:
recorded in `docs/tech-debt.md`. Moving to Neon or a paid Postgres later is a `DATABASE_URL` change.
