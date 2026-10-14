# 0012. CI: GitHub Actions runs pnpm check + build

Date: 2026-10-14 · Status: Accepted

## Context
Every PR, from any model, must prove it did not break the repo.

## Decision
`.github/workflows/ci.yml` on `pull_request` and `push` to `main`: pnpm install (cached), `pnpm check`,
`pnpm build`, API e2e against a Postgres service container, Playwright (both viewports) against the built web +
API. Turbo remote cache is off (free tier ok without it). Bugs are GitHub Issues with a template
(steps / expected / actual / area). Claude Code GitHub Action for PR review is documented but off by default
(costs API credit).

## Consequences
CI time is the main cost; e2e is split into its own job so unit feedback arrives first.
