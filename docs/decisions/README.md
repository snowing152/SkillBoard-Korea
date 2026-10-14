# Architecture Decision Records

Short records of decisions that are hard to reverse. Template: `_template.md`.
New ADR = next number, Status `Proposed`, and a PR. Changing a decision = new ADR that supersedes the old one;
never edit an accepted ADR's Decision section.

| #    | Title                                                                             | Status   |
| ---- | --------------------------------------------------------------------------------- | -------- |
| 0001 | TypeScript strict mode everywhere                                                 | Accepted |
| 0002 | Monorepo with pnpm workspaces and Turborepo                                       | Accepted |
| 0003 | Frontend: Next.js App Router, mobile-first PWA                                    | Accepted |
| 0004 | Backend: Nest.js as a separate API                                                | Accepted |
| 0005 | PostgreSQL with Prisma 7                                                          | Accepted |
| 0006 | Zod schemas in packages/shared are the single contract                            | Accepted |
| 0007 | UI kit: Tailwind CSS + shadcn/ui owned in-repo                                    | Accepted |
| 0008 | i18n with next-intl; en/ko/ru; language = folder + config line                    | Accepted |
| 0009 | Auth in Nest.js: Passport (Google + local), argon2id, access + refresh tokens     | Accepted |
| 0010 | Tests: Jest (api), Vitest (web, shared), Playwright in two viewports              | Accepted |
| 0011 | Local dev: Docker Compose for PostgreSQL, seed script                             | Accepted |
| 0012 | CI: GitHub Actions runs pnpm check + build                                        | Accepted |
| 0013 | Hosting: free tiers only (Vercel, Neon, Render, Resend)                           | Accepted |
| 0014 | REST + OpenAPI generated from Zod via nestjs-zod; typed client for web and mobile | Accepted |
| 0015 | Future chat: isolated Nest module with WebSocket gateway                          | Accepted |
| 0016 | Data model keeps monetization open                                                | Accepted |
| 0017 | API conventions: errors, pagination, IDs, time                                    | Accepted |
| 0018 | Security and personal data (PIPA)                                                 | Accepted |
