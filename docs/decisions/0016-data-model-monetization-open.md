# 0016. Data model keeps monetization open

Date: 2026-10-14 · Status: Accepted

## Context

Monetization is undecided: company subscriptions, paid profile promotion, or commission/pay-per-contact.
The MVP must not block any of them, nor build any.

## Decision

- `User` owns at most one `TalentProfile` now, and later at most one `Organization` (new table,
  `ownerUserId`). Clients who are private individuals stay plain Users forever; nothing assumes a company.
- No price, plan, credit, or payment column on `User`, `TalentProfile`, or `ContactReveal`. Future tables:
  `Subscription(userId|organizationId, plan, status, periodEnd)`, `Promotion(profileId, from, to)`,
  `Payment(...)`. Each references core ids; core tables stay unaware.
- `ContactReveal` is logged from day one, so pay-per-contact or monthly limits can be computed from history.
- Search ordering is a single function in `SearchService` (`rankProfiles`) so "promoted first" is a local change.
- Reviews later: `Review(profileId, authorUserId, rating, text)`; rating aggregates computed, not stored, until
  scale requires caching.

## Consequences

A small amount of "unused" structure (`ContactReveal`, `AuthIdentity`) in exchange for never migrating
core tables for a business-model change.
