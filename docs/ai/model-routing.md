# Model routing

Rule: the cheapest model that finishes without a retry. Switch with `/model` in Claude Code,
`claude --model <id>` at start, or `model:` in a subagent or skill frontmatter. Output tokens cost the
most, so prefer the model that writes less but right.

| Model                 | Use for                                                                                   | Examples here                                                                                                           | Not for                                                |
| --------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Fable** (architect) | decisions that are hard to reverse; cross-cutting changes; the reference feature          | a new ADR; changing boundaries, tsconfig or hooks; the Phase D reference feature; a bug that spans web, api and infra   | routine features, tests, translations                  |
| **Opus**              | visual design and UI quality; hard bugs with unclear cause; security-sensitive logic      | restyling tokens and `components/ui`; responsive polish; reviewing auth and token rotation; flaky Playwright root cause | scaffolding, bulk CRUD                                 |
| **Sonnet** (default)  | implementing specs by copying the reference; tests; reviews; refactors inside one package | `/implement search`; `/new-module reports`; `reviewer` and `test-writer` subagents; a migration for a spec              | design decisions; changing rules                       |
| **Haiku**             | mechanical chores with a check that proves them                                           | renames; translating `messages/*`; `i18n-checker`; fixing lint output; adding an enum value with its three names        | auth, data model, anything touching more than ~3 files |

## Deciding in 30 seconds

1. Spec plus a reference to copy? Sonnet.
2. Pixels or UX judgement? Opus.
3. Mechanical, with a test or lint that proves it? Haiku.
4. Changes a rule, an ADR, a boundary or the hooks? Fable (Opus if the Fable budget is gone), and update
   the doc in the same PR.

## Cost habits

- One feature per session; `/clear` between features. `CLAUDE.md` stays under 150 lines; path rules
  load on demand.
- Let hooks do the checking (`pnpm check` runs on Stop). Point at files instead of pasting logs.
- Delegate reviews and tests to the pinned subagents instead of the main session.
- Never ask a large model to read generated files (`openapi.json`, `schema.ts`, `src/generated`).

## Claude Code GitHub Action (optional, off by default)

Costs API credit per PR, so it is not installed. When wanted: run `/install-github-app` in Claude Code
(needs `gh auth login` and repo admin) and choose the review workflow. It stores `ANTHROPIC_API_KEY` as a
repository secret and opens a PR that adds `.github/workflows/claude-code-review.yml` running
`anthropics/claude-code-action@v1` with `prompt: "/code-review:code-review --comment …"`. Cap cost with
`claude_args: "--max-turns 5 --model claude-sonnet-5-5"` and a workflow `timeout-minutes`. It reads
`CLAUDE.md` and `AGENTS.md`, so keep them short. Uninstall by deleting the workflow and the secret.
