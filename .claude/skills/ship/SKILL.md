---
name: ship
description: >
  Branch, commit, and open a PR for a completed Mirror Chess change. Use ONLY when the
  owner explicitly asks to commit / ship / open a PR. Creates a feature branch off
  `dev`, makes one conventional commit, and opens a PR into `dev` using the repo
  template.
---

# Ship a change

Run only when the owner explicitly asks. **Never commit to `main`.**

## Preconditions (verify, don't assume)
- QA passed and review is APPROVE (or the owner explicitly waived it). If not, say so
  and stop.
- `npm run build` and `npm run test` are green — re-run if unsure.

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
