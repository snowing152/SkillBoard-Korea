# 0022. Account deletion: 14-day grace period, scheduled purge, blocked-email hash for moderated accounts

Date: 2026-10-14 · Status: Accepted · Amends the deletion bullet of 0018

## Context

ADR 0018 made deletion immediate and hard. The owner decided (CHECKPOINT E) that users need a way back
from an accidental or impulsive deletion, and that accounts hidden by moderation must not simply
re-register with the same email the next day.

## Decision

- **Request**: `DELETE /v1/me` sets `User.deletionRequestedAt`, revokes every refresh token, and emails
  a cancel link (one-time token, valid for the whole grace period). From that moment the profile is
  excluded from search and its public URL is 404 (part of the visibility predicate in `docs/domain.md`),
  and `login`, `refresh` and the Google exchange answer `FORBIDDEN` with reason `DELETION_PENDING`.
- **Cancel**: the link calls `POST /v1/auth/deletion/cancel`, which clears `deletionRequestedAt`. The
  user then signs in normally. Nothing else is touched, so a cancelled deletion is lossless.
- **Purge**: a GitHub Actions cron (daily, 12:00 KST) calls `POST /v1/admin/jobs/purge-deleted-accounts`
  with the `x-job-token: <JOB_SECRET>` header (a job guard, not a user JWT: the job has no user). The
  endpoint hard-deletes every user whose `deletionRequestedAt` is older than `DELETION_GRACE_DAYS`
  (default 14); cascades and `SetNull` work as in 0018.
- **Exception for moderated accounts**: when the purged user's profile has `hiddenAt` set, the purge
  first writes `BlockedEmail { emailHash = sha256(lowercased email + EMAIL_HASH_PEPPER), reasonCode,
blockedAt, expiresAt = blockedAt + 1 year }`. Registration and Google sign-up reject an email whose
  hash is in that table and not expired (`FORBIDDEN`, reason `EMAIL_BLOCKED`). The purge also deletes
  expired rows. The privacy policy discloses this retention.
- Admin accounts cannot request deletion (demote first).

## Consequences

Deletion becomes a two-step process and needs email (ADR 0013 Resend) and one scheduled workflow with
two repository secrets (`API_URL`, `JOB_SECRET`). The job doubles as the keep-alive for Supabase and
Render (ADR 0021). The 14-day grace and the 1-year block are owner choices pending legal review under
PIPA (`docs/tech-debt.md`); both are env or constant values, so changing them is not a migration. The
hash is salted with a server pepper, so the table alone does not reveal addresses, but it is still
personal data in PIPA terms and is listed as such.
