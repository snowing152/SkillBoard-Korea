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
- **Google state is bound to the browser**: `GET /v1/auth/google` sets an `HttpOnly`, `SameSite=Lax` cookie
  `skillboard_oauth_nonce` on the API origin, path `/v1/auth/google`, 10 minutes; the `state` JWT carries the
  same nonce and the callback accepts the flow only if both match, then clears the cookie.
- **Google role step**: `role` and `acceptTerms` are optional, together, on the start query. Without them
  (sign-in page) an unknown Google user gets nothing created; the callback redirects to the web app with a
  signed 10-minute `signup` token, which the web server keeps in an `HttpOnly` cookie and redirects to
  `/sign-up/google`. There the person picks a role and accepts the terms; `POST /v1/auth/google/complete`
  creates the account and returns a session. The endpoint only creates: an existing identity or email is
  `CONFLICT`, so the token cannot be used to sign in to an account.
- Korean UI strings use 해요체, legal texts 합니다체 (`.claude/rules/i18n-messages.md`).

## Consequences

One new column and one new endpoint. A device that was signed out by a password change gets a plain 401 and
leaves the other sessions alone. The nonce cookie needs the browser to send a first-party-style cookie on a
top-level redirect back to the API: `SameSite=Lax` allows it. The signup token appears once in a redirect URL
between API and web server (as the 60 s exchange code already does) and is not a credential for any existing
account.
