---
name: update-status
description: Update docs/status.md for the current PR (Done, In progress, Next, Key decisions) and keep it under 150 lines.
disable-model-invocation: true
---

Update `docs/status.md` so it matches the branch you are about to open as a PR.

1. Read `docs/status.md`, `git log main..HEAD --oneline` and `gh pr list --state all`.
2. **Done:** add one line `#<PR> type: summary` (the next PR number if the PR is not open yet).
3. **In progress:** list open PRs and unmerged branches; drop this one once it is merged.
4. **Next:** remove the finished item; keep the remaining MVP specs in `docs/roadmap.md` order.
5. **Key decisions:** one line per new or superseding ADR, with its number.
6. Touch Launch blockers, Lessons learned and Budget only if this PR changed them.
7. Update the "Last updated" date. Keep the file under 150 lines: move detail to the right doc
   (`docs/tech-debt.md`, `docs/pitfalls.md`, an ADR) and link it, never grow the file.
8. Do not invent facts: every line must come from the repo, `gh` or the owner.
