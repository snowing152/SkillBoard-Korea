# 0003. Frontend: Next.js App Router, mobile-first PWA

Date: 2026-10-14 · Status: Accepted

## Context

Public talent profiles need SEO (SSR). Users are on phones. No budget for app stores in MVP.

## Decision

Next.js 16 App Router in `apps/web` with `src/` layout. Public pages (home, search, `/t/[slug]`) are Server
Components fetching from the API; forms are Client Components. Request interception uses `src/proxy.ts`
(Next 16 name for middleware; Node runtime). PWA via `app/manifest.ts` (`MetadataRoute.Manifest`), icons,
and a minimal service worker that serves `/offline` when the network is down. No heavy PWA plugin.
Mobile-first: every page is built and reviewed at 390px width first, desktop second.

## Consequences

No API routes inside Next.js except framework-internal ones; all data goes through the Nest API, so the future
mobile app has nothing to duplicate. Service worker caching is deliberately minimal to avoid stale-data bugs.
