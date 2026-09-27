# Task — Dependency audit, 2026-09-27

> **Status: OPEN — dev-only, so not urgent; recorded so it is a decision rather than an
> oversight.** Part of the [quality epic](./README.md).

## What `npm audit` says

| Scope | Result |
| --- | --- |
| **Production** (`--omit=dev`) | **0 vulnerabilities** |
| Dev toolchain | 21 — 2 critical, 15 high, 3 moderate, 1 low |

The critical ones are `vitest` and `@vitest/coverage-v8`; the high ones are mostly
transitive (`brace-expansion`, `minimatch`, `glob`, `js-yaml`, `flatted`, `browserslist`)
reached through `@playwright/test` and the old ESLint tree.

## What it means, honestly

**Nothing ships with a known vulnerability.** The shipped bundle is React, Ionic and this
repo's own code, and that set is clean.

The dev findings are not nothing — a compromised test runner executes on this machine and
would run in CI — but they are a different risk with a different fix, and `npm audit fix
--force` on a working toolchain is how a green suite turns red for unrelated reasons.

## Why this went unnoticed until a deliberate pass

`npm audit` is not run by anything. Neither is ESLint — a legacy `.eslintrc.cjs` meets
ESLint 9's flat config, so it has **never run in this repo**
([`../rules/task-lint-does-not-run.md`](../rules/task-lint-does-not-run.md)). The three
bespoke checkers cover layering, doc links and test naming; nothing covers dependency
health or the lint rules a linter would give for free.

That is the finding worth acting on: not the 21 advisories, but that **no automated check
would have told us about them**.

## Acceptance Criteria

- [ ] `npm audit --omit=dev` runs as part of the check suite and fails on a **production**
      advisory. Dev advisories are reported, not fatal — otherwise the check is noise and
      gets ignored, which is worse than not having it.
- [ ] The dev-tree advisories are triaged once: upgrade what upgrades cleanly, record what
      does not and why.
- [ ] Decide the ESLint question rather than leaving it — adopt flat config, or delete
      `.eslintrc.cjs` and say plainly that the bespoke checkers are the standard here. The
      current state is the worst of both: a config that looks like linting and is not.
