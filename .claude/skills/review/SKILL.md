---
name: review
description: Review the current branch diff against the golden rules, the spec and the security checklist. Runs in the read-only Sonnet reviewer subagent.
argument-hint: '[spec-slug] [base-branch]'
context: fork
agent: reviewer
---

Review this branch against `main` (or base branch `$1` if given) for the spec `$0` (if empty, infer it
from the branch name `feat/<slug>` → `docs/specs/<slug>.md`).

1. Collect the change: `git status --short`, `git diff main...HEAD --stat`, `git diff main...HEAD`, and
   `git diff` for uncommitted work.
2. Read the golden rules in `AGENTS.md`, `docs/conventions.md`, the spec, and the `CLAUDE.md` of each
   touched area.
3. Check in this order, citing `path:line` for every finding:
   - Spec: every acceptance criterion covered; nothing built that the spec puts out of scope.
   - Contract: Zod schemas in `packages/shared` for every input and output; DTOs one-liners;
     `apps/api/openapi.json` and `packages/api-client/src/schema.ts` regenerated; no hand-written API
     types.
   - Placement: controllers route, components render, services and `lib/` hold logic.
   - Security (ADR 0018): ownership from the authenticated user; draft or hidden profiles 404 publicly;
     no secrets, tokens or contact values in responses or logs; length caps on inputs; rate limits on
     sensitive routes; no new personal data without a reason in the spec.
   - i18n: no hard-coded UI text; keys in en/ko/ru; ICU plurals.
   - Mobile-first: base classes for phone, breakpoints additive; touch targets; loading, empty and error
     states.
   - Conventions (ADR 0017, `docs/conventions.md`): ids, timestamps, error shape, pagination, naming,
     commit messages.
   - Tests: unit tests for services and schemas, a regression test for every bug fix, Playwright only for
     named flows, deterministic.
   - Docs: ADR or doc updated when a rule changed; pitfalls and tech-debt rows where due.
4. Run `pnpm check` and quote the failure verbatim if it fails.
5. Output: a verdict (approve / request changes) and findings grouped as **Blocking** (rule or spec
   violation), **Should fix**, **Nit**, one line each with `path:line` and the rule it breaks. Do not edit
   files.
