---
name: spec
description: Write a feature spec in docs/specs/ from the template, concrete enough for Sonnet to implement it without asking questions.
argument-hint: <slug, e.g. legal> [one-line goal]
---

Write `docs/specs/$0.md` for: $ARGUMENTS

`$0` is the spec slug. If you were given a path (`docs/specs/legal.md`), strip the `docs/specs/`
prefix and the `.md` suffix first; use the bare slug (`legal`) everywhere below.

1. Read `docs/specs/_template.md`, `docs/domain.md`, the conventions section of `docs/architecture.md`,
   and the ADRs the feature touches (0009 auth, 0014 API, 0016 data model, 0017 conventions,
   0018 security). Read one existing spec in `docs/specs/` for the style, if any.
2. Fill every section of the template:
   - Routes are concrete (`PATCH /v1/me/talent-profile`) with shared schema names for request and
     response, auth level, and the error code per failure.
   - Data changes diff against the Prisma draft in `docs/domain.md`: columns, indexes, migration name,
     seed changes, cascade behaviour.
   - UI: pages, Server vs Client Components, states (loading, empty, error, success), phone layout
     first, namespaces and keys.
   - Acceptance criteria are testable "Given … when … then …" sentences, including validation limits,
     visibility, ownership, three locales, phone width, PIPA points. Mark which get a Playwright test.
   - Out of scope says what is not built and where it would plug in later.
   - Example content from the launch niche (a Russian tutor in Seoul, an SMM freelancer in Busan, a
     parent looking for a tutor).
3. Stay under ~150 lines. Anything not decided by an ADR becomes an "Open questions" item at the end;
   do not guess product behaviour.
4. Run `pnpm exec prettier --write docs/specs/$0.md`. Report the open questions, if any.
