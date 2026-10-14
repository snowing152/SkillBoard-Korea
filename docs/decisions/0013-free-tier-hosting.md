# 0013. Hosting: free tiers only (Vercel, Neon, Render, Resend)

Date: 2026-10-14 · Status: Accepted

## Context

$0/month after launch. Free tiers change often; the limits below are as of 2026-10 and must be re-checked
at sign-up time. Nothing in code may depend on a specific host.

## Decision

| Piece  | Choice                                    | Why                                                   | Trade-off                                                                                                                                                                                                            |
| ------ | ----------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web    | Vercel Hobby                              | Native Next.js, Turborepo-aware, free SSL             | Non-commercial-use clause on Hobby; move to Pro ($20) when revenue starts                                                                                                                                            |
| DB     | Neon free (Postgres, Singapore region)    | Scale-to-zero, branches for previews, no weekly pause | ~0.5 GB cap; cold start ~0.5–1 s after idle; data stored outside Korea → privacy policy must disclose overseas transfer (PIPA). Alternative: Supabase free has a Seoul region but pauses projects after 7 idle days. |
| API    | Render free web service (Docker)          | Simple, free SSL, env vars UI                         | **Sleeps after ~15 min idle; first request takes 30–60 s.** Mitigation: web shows a "waking up" state on the first call; optional external uptime pinger.                                                            |
| Email  | Resend free                               | 3,000 emails/month, 100/day, simple API               | Needs a verified domain                                                                                                                                                                                              |
| Photos | Cloudflare R2 free (S3-compatible, 10 GB) | No egress fees, S3 API                                | **Owner decision 2026-10-14: profile photos are uploaded and stored (R2 via `StoragePort`); video stays an external link (YouTube etc.).** Local dev uses RustFS (S3-compatible) in Docker Compose.                  |
| OAuth  | Google Cloud (free)                       | –                                                     | –                                                                                                                                                                                                                    |

All hosts are reached only through env variables validated at boot (`DATABASE_URL`, `API_URL`, `WEB_URL`,
`EMAIL_PROVIDER` + key, `STORAGE_*`). Email and storage sit behind small interfaces (`MailPort`, `StoragePort`)
with one implementation each, so swapping a provider is one file.

## Consequences

**Chat impact**: a sleeping API cannot hold WebSocket connections. When chat ships, the API must move to an
always-on host (Render Starter ~$7, Fly, or a small VPS) or chat must use a managed realtime service.
This is recorded in `docs/tech-debt.md` and ADR 0015. Neon's size cap is fine for tens of thousands of profiles.
