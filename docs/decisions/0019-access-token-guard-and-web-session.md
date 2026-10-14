# 0019. Access tokens: own Nest guard, Zod-validated login, web session in an httpOnly cookie

Date: 2026-10-14 · Status: Accepted · Refines 0009 (strategy list) and 0017 (cursor encoding)

## Context

ADR 0009 named `passport-local` and `passport-jwt`. Building the reference feature showed two problems:
Nest guards run before pipes, so a Passport local strategy reads the body before the Zod DTO validates it
and answers with Nest's own 401 shape instead of ADR 0017's; and `passport-jwt` adds three packages for
what is a 30-line guard. The web app also needed one agreed place to keep the token.

## Decision

- **API guard**: `JwtAuthGuard` in `apps/api/src/common/auth/` verifies the bearer with `@nestjs/jwt`
  and parses the payload (`{ sub, roles }`) with Zod. It is global; `@Public()` opts a route out but
  still attaches `req.user` when a valid token is present (optional auth for search and contact reveal).
  `RolesGuard` enforces `@Roles('ADMIN')`. `@CurrentUser()` is the only way a handler learns who calls.
- **Login** `POST /v1/auth/login` is a normal Zod-validated endpoint; the service checks argon2id and
  signs the token. No Passport for local or JWT. Passport stays the plan for Google OAuth only.
- **Token**: TTL `JWT_ACCESS_TTL_SECONDS` (default 900), secret `JWT_ACCESS_SECRET` (min 32 chars).
  Refresh tokens stay as in 0009 and arrive with the accounts spec; until then a session lasts one TTL.
- **Web session**: the Next.js server stores the access token in an `httpOnly; SameSite=Lax` cookie
  (`apps/web/src/lib/session.ts`). Browser code never holds it. Client Components call Server Actions
  (`apps/web/src/actions/`), which read the cookie and call the API with `apiAsUser()`. The mobile app
  sends the same token as a bearer from secure storage, so the API does not care which client calls.
- **Cursor**: the opaque cursor of 0017 is implemented as base64url of the last id in
  `apps/api/src/common/pagination/cursor.ts`; services never build cursors by hand.

## Consequences

Three fewer dependencies and one error shape for every 401. Every route is private unless it says
`@Public()`; the health check needed it, which the e2e test caught. Google sign-in will use
`@nestjs/passport` only for the OAuth redirect dance. `@nestjs/jwt` is pinned to 11.x because 12 is
ESM-only and Jest runs CommonJS (`docs/tech-debt.md`).
