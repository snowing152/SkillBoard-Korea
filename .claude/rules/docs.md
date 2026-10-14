---
paths:
  - 'docs/**'
  - '*.md'
  - 'apps/*/CLAUDE.md'
  - 'packages/*/CLAUDE.md'
---

# Docs rules

- Short and dense: agents read these on every related task. Tables and bullets, no filler, no repetition
  of what code or ADRs already say.
- ADRs (`docs/decisions/`): one decision each, from `_template.md`, next number, plus a row in the index
  `README.md`. Never edit the Decision section of an accepted ADR; write a new one marked
  `Supersedes NNNN` and set the old one to `Superseded by`.
- Specs (`docs/specs/<slug>.md`) follow `_template.md` section by section and are written so Sonnet can
  implement without questions: concrete routes, schema names, states, testable acceptance criteria.
  Example content comes from the launch niche (tutors, SMM, translators).
- `docs/pitfalls.md`: one row per lesson; delete the row once a lint rule, test or hook enforces it.
  `docs/tech-debt.md`: one row per shortcut (what, why, risk, when to fix).
- Anything a tool can check goes into ESLint, Prettier, tsconfig or a hook, not into prose.
- The library-facts table in `docs/architecture.md` is verified against current docs; update the date when
  you re-verify a row.
- Mermaid for diagrams, relative links, no screenshots committed.
