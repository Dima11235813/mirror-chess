---
name: ship
description: >
  Branch, commit, and open a PR for a completed Mirror Chess change. Use when a PR is
  wanted — for a change that needs discussion rather than delivery, or when the owner
  asks for one. Routine delivery no longer needs this skill or permission: since
  2026-10-10 verified work is committed and pushed through to `main` as a matter of
  course (CLAUDE.md §3).
---

# Ship a change

> **Changed 2026-10-10.** Committing no longer needs asking, and `main` is no longer
> off-limits (CLAUDE.md §3). This skill is now for the case where a **pull request** is
> what is wanted — a change that should be discussed, reviewed or landed by someone else —
> rather than for permission to commit. For ordinary delivery, just commit: branch → `dev`
> → `main` → push, once it is green.

## Preconditions (verify, don't assume)
- QA passed and review is APPROVE (or the owner explicitly waived it). If not, say so
  and stop.
- `npm run build` and `npm run test` are green — re-run if unsure. **The gate is now "is
  it green?" rather than "did they say yes?", which makes this list the whole safeguard.**

## Steps
1. `git status` / `git diff` — confirm the change is exactly what the owner expects;
   show them. If unrelated changes are present, ask before including them.
2. Branch off `dev`: `git switch dev && git pull --ff-only`, then
   `git switch -c <type>/<epic>-<slug>` where `<type>` ∈ {feat, fix, chore}.
3. Stage intentionally — no stray files, no `.serena/cache`, no build artifacts;
   respect `.gitignore`.
4. Commit with a conventional message `"<type>(<scope>): <imperative subject>"`, body
   explaining WHY and referencing the prj-mgmt story. Include the required
   Co-Authored-By and session trailers.
5. Push and open a PR **into `dev`** with `gh pr create`, filling
   `PULL_REQUEST_TEMPLATE.md` and linking the story; add the generated-with footer.
6. Report the branch name and PR URL.

## Guardrails
- One logical change per commit / PR — do not bundle unrelated edits.
- Do not force-push, skip hooks, or bypass signing unless explicitly told to.
