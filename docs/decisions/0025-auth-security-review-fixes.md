# 0025. Auth security review: one refresh successor, Google linking ends the old password, links carry no consent

Date: 2026-10-16 · Status: Accepted · Amends the `/refresh` and role-step bullets of 0024 and the linking rule of 0009

## Context

An independent security review of the `accounts` branch (2026-10-16) found that the grace window of ADR
0024 minted a fresh, independent refresh token for every repeat of a just-rotated token. A thief who
presented a stolen token inside the window got a 30-day chain of their own that reuse detection never
saw, because each token in either chain was used only once. The review also found that linking a Google
identity to an existing account left that account's password and sessions alive: whoever had registered
the address first (pre-hijack) kept access after the real owner verified it and signed in with Google.

## Decision

- **One successor per refresh token.** The token that replaces a presented token is derived, not random:
  `HMAC-SHA256(JWT_REFRESH_PEPPER, "refresh-successor:" + presented)`, base64url (same 43-character shape).
  Only its `sha256(token + pepper)` is stored, as before. A repeat inside `REFRESH_GRACE_SECONDS` returns
  that same successor (looked up by its hash) instead of minting another; if it was revoked or expired
  meanwhile, plain `UNAUTHENTICATED`. Everything else in the 0024 `/refresh` bullet stands: unknown,
  revoked or expired → plain 401; rotated longer ago than the grace → revoke all.
- **Linking a Google identity to an existing account** clears that account's `passwordHash` and revokes
  all its refresh tokens in the same transaction as the link; the owner sets a password through the reset
  mail. A Google profile without `email_verified` never creates an account or a parked sign-up
  (`error=OAUTH_FAILED`).
- **A link carries no consent.** The Google callback never creates an account: every unknown Google user
  is parked and goes through the role step, whose POST (Server Action, origin-checked) records the
  consent. `acceptTerms` is gone from `GoogleStartQuerySchema`; `role` stays, only to preselect the role
  there. Amends the role-step bullet of 0024, which created the account at once when the start query had
  `role` and `acceptTerms`: `/auth/google?role=CLIENT&acceptTerms=true` was a link anyone could send, and
  following it recorded a TERMS and PRIVACY consent nobody had ticked (PIPA).

## Consequences

Parallel tabs and a thief inside the window now share one chain, so the next replay of either copy after
the window revokes everything. Tokens rotated before this change have a random successor, so a repeat of
one inside its grace window gets a 401 once; harmless before launch. The grace window may now be raised
without creating untracked chains. A person who links Google to a password account loses the password and
is signed out elsewhere, once; the account settings page already offers "set a password" by mail.
Google sign-up from `/sign-up` takes one more screen (tick the box, press "Create account").
