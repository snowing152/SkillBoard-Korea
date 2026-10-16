# 0024. Auth hardening: rotation vs revocation, bound Google state, Google role step, password change

Date: 2026-10-16 · Status: Accepted · Amends the rotation bullet of 0020

## Context

Review of the `accounts` implementation and the owner's decisions (2026-10-16) changed four rules of ADR 0020
and the accounts spec:

- ADR 0020 revoked every refresh token of a user when an _expired_ token was presented. A phone that sat
  unused for a month would then sign the user out of every other device.
- Deliberately revoked tokens (logout, password change) were stored with the same `revokedAt` as rotated
  ones, so a signed-out device presenting its old token looked like a replay and revoked all sessions,
  including the one that had just changed the password.
- The Google `state` was signed but not tied to the browser that started the flow (login CSRF).
- "Continue with Google" on the sign-in page created a `CLIENT` account for an unknown Google user without
  any role choice or consent step.

## Decision

- **Two timestamps on `RefreshToken`.** `rotatedAt`: exchanged for a newer token by `/refresh`.
  `revokedAt`: ended on purpose (logout, logout all, password change or reset, theft response).
- **`/refresh` rules**: unknown, revoked or expired → plain `UNAUTHENTICATED`, nothing else is touched.
  Rotated less than `REFRESH_GRACE_SECONDS` ago → concurrent refresh, fresh pair, nothing revoked. Rotated
  longer ago → replay: revoke every refresh token of the user and answer `UNAUTHENTICATED`. Only this last
  case revokes everything.
- **Password change** (`POST /v1/me/password`) revokes every refresh token except the one named in the
  optional `refreshToken` field (the web sends its cookie value); without it, all are revoked. A password
  reset revokes all and also sets `emailVerifiedAt` (opening the emailed link proves the inbox).
- **Rotation and revocation are serialised**: `rotate`, `revokeAll` and `revokeAllExcept` run in a
  transaction that first locks the user row (`FOR UPDATE`), so "sign out everywhere" and a concurrent
  refresh never interleave: a rotation that loses the race finds its token revoked (401), one that wins is
  followed by a revoke that also ends the token it just issued.
- **Google flow is bound to the browser on both legs** (login CSRF). Leg 1, API: `GET /v1/auth/google`
  sets an `HttpOnly`, `SameSite=Lax` cookie `skillboard_oauth_nonce` (API origin, path `/v1/auth/google`,
  10 minutes) and the callback accepts the flow only if the `state` nonce matches it. Leg 2, web: the
  "Continue with Google" links point at the web route `/[locale]/auth/google`, which puts a random
  `webNonce` into an `HttpOnly` web cookie `skillboard_google_nonce` and passes it through `state`; the API
  echoes it as `n` in the final redirect, and `/auth/callback` refuses a `code` or `signup` token unless
  `n` equals the cookie (then deletes it). A callback URL built in the attacker's browser carries the
  attacker's `n`, which the victim's browser has no cookie for.
- **Google role step**: `role` and `acceptTerms` are optional, together, on the start query. Without them
  (sign-in page) an unknown Google user gets nothing created; the identity is parked in the
  `OAuthSignup` table (10 minutes, deleted on use, expired rows swept on every insert) and the callback
  redirects to the web app with an opaque random `signup` token, so no email or name appears in a URL or a
  log. The web server keeps the token in an `HttpOnly` cookie and redirects to `/sign-up/google`. There the person picks a role and accepts the terms; `POST /v1/auth/google/complete`
  creates the account and returns a session. The endpoint only creates and the token is single use: an existing identity or
  email is `CONFLICT`, a used or expired token `NOT_FOUND`, so it can never sign in to an account.
- `POST /v1/me/password` is throttled to 10 per minute per IP, and the new hash and the revocation of the
  other sessions commit in one transaction.
- Korean UI strings use 해요체, legal texts 합니다체 (`.claude/rules/i18n-messages.md`).

## Consequences

One new column (`RefreshToken.rotatedAt`, no backfill: tokens rotated before the migration count as
revoked, which is harmless before launch), one new table (`OAuthSignup`) and one new endpoint. A device that was signed out by a password change gets a plain 401 and
leaves the other sessions alone. The nonce cookie needs the browser to send a first-party-style cookie on a
top-level redirect back to the API: `SameSite=Lax` allows it. The opaque signup token appears once in a redirect URL between API and web
server (as the 60 s exchange code already does) and is not a credential for any existing account.
