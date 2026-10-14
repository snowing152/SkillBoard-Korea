---
name: implement
description: Implement a spec from docs/specs/ end to end by copying the reference feature, then run pnpm check.
argument-hint: <spec-slug, e.g. legal>
disable-model-invocation: true
---

Implement `docs/specs/$0.md`.

`$0` is the spec slug. If you were given a path (`docs/specs/legal.md`), strip the `docs/specs/`
prefix and the `.md` suffix first; use the bare slug (`legal`) everywhere below.

1. Read the spec, the "Workflow for a feature" and "Reference feature to copy" sections of `AGENTS.md`,
   and the `CLAUDE.md` of every part you will touch. If the spec has open questions, stop and ask.
2. Branch: `git switch -c feat/$0` from an up-to-date `main`.
3. Build in this order and run the narrowest check after each step:
   1. `packages/shared`: schemas, types, `index.ts` export, `*.test.ts` →
      `pnpm --filter @skillboard/shared build && pnpm --filter @skillboard/shared test`.
   2. Prisma: model, `pnpm --filter @skillboard/api db:migrate --name <name>` (needs `pnpm db:up`),
      seed update.
   3. Nest module: service with spec → dto → controller → register in `app.module.ts` →
      `pnpm --filter @skillboard/api test`.
   4. `pnpm api-client:generate`; commit the regenerated files with the API change.
   5. Web: page and components, forms with the shared schema, messages in en/ko/ru, loading, empty and
      error states; check at 390 px first.
   6. Tests the spec names (unit; Playwright only for named flows).
4. `pnpm check`, fix everything it reports. Run `pnpm test:e2e` if routes or pages changed and Docker is
   up; otherwise say that e2e was not run.
5. Walk the acceptance criteria one by one and say which commit satisfies each. Add a `docs/pitfalls.md`
   row for a general trap, a `docs/tech-debt.md` row for any shortcut.
6. Commit in small steps (`docs/conventions.md`), open a PR with the template. Never force-push, never
   touch `.env*`.
