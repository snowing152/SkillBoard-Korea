# 0009. Auth in Nest.js: Passport (Google + local), argon2id, access + refresh tokens

Date: 2026-10-14 · Status: Accepted (linking rule amended by 0025: linking needs a confirmation POST, then clears the password and revokes all sessions)

## Context

Web and a future mobile app share login. Email verification is required. No third-party auth SaaS (cost, lock-in).

## Decision

- Strategies: `passport-local` (email + password) and `passport-google-oauth20`. Google callback is handled by
  the API; it redirects to the web with a one-time code exchanged for tokens (no tokens in URLs).
- Passwords: `argon2id` via the `argon2` package. Emails lower-cased before lookup.
- Access token: JWT (`@nestjs/jwt`), 15 min, carries `sub` and `roles`. Sent as `Authorization: Bearer`.
- Refresh token: opaque 256-bit random, stored hashed in `RefreshToken`, 30 days, **rotated on every use**,
  family revoked on reuse. Web receives it as an `httpOnly; Secure; SameSite=Lax` cookie scoped to
  `/auth/refresh`; mobile receives it in the response body and stores it in secure storage.
- Email verification and password reset: one-time hashed tokens (`VerificationToken`), 24h / 1h expiry.
- Guards: `JwtAuthGuard` global by default; `@Public()` decorator opts out; `@Roles('ADMIN')` for admin routes.

## Consequences

Phase D implements only what the reference feature needs (local login + JWT guard); Google, verification,
and reset go to Sonnet via the accounts spec. Linking a Google identity to an existing email account is
allowed only when that email is verified (prevents account takeover).
