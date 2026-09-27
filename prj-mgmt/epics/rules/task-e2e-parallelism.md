# Task — Make `npm run e2e` reliable at default parallelism

## Problem

`npx playwright test` with the config's default worker count (`fullyParallel: true`,
workers derived from CPU count) intermittently fails with

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Test timeout of 30000ms exceeded while setting up "page".
```

on roughly half the suite. Lowering concurrency **reduces but does not eliminate** it:

| Workers | Observed |
| --- | --- |
| default | ~half the suite fails |
| 2 | occasional single flake |
| 1 | still an occasional single flake |

The failures are always `page.goto` (or the first click after it) timing out against
`vite preview`, never an assertion. The affected test passes on its own every time,
so it is a server/startup timing problem rather than a test defect — concurrency
makes it much more likely but is not the whole cause.

## Update (2026-08-05) — the suite outgrew the `--workers=2` workaround

The suite has grown from ~30 to **56 tests** (draw rules, special moves, the opponent).
At that size `--workers=2` fails 2 of 56 on a typical run, both passing in isolation.

`--workers=1` has been reliable across every full run this session — a dozen or more,
including runs that spawn a Web Worker per test. The whole suite takes ~23 s serially,
so the parallelism was buying very little to begin with.

**`npm run e2e -- --workers=1` is the documented command** (`roadmap.md`, Local
Development). This task remains open as the *root cause* — a preview server that is not
reliably ready when Playwright thinks it is — and the likely fix is still a proper
readiness check rather than a worker count.

Observed while verifying
[`reconcile-core-to-spec.md`](./reconcile-core-to-spec.md) on Windows 11.

## Why it matters

A suite that fails for environmental reasons trains everyone to ignore red. That is
how the stray `test.only` below survived.

## Related finding (already fixed)

`prj-mgmt/epics/game-logic/pawn/pawn-regular-move.e2e.ts` contained two `test.only`
calls, which silently reduced the entire Playwright run from 17 tests to 2 — hiding a
broken knight scenario and a failing bishop case for an unknown period. The `.only`
has been removed.

## Acceptance Criteria

- [ ] `npm run e2e` passes repeatably on a clean checkout without extra flags —
      verified by running it several times, since the failure is intermittent.
- [ ] The fix is in `playwright.config.ts` (e.g. a `workers` cap, a longer
      `webServer.timeout`, a per-test `navigationTimeout`, or serving the built
      `dist/` with a sturdier static server) rather than in individual tests.
- [ ] Consider `retries: 1` locally as a stopgap — the config currently retries only
      in CI, so a local flake reads as a hard failure.
- [ ] CI and local behavior are considered separately if they need different caps.
- [ ] A lint or CI check rejects `.only` in `*.e2e.ts` (Playwright's
      `forbidOnly: !!process.env.CI` covers CI; local needs the lint rule).

## Notes

`forbidOnly` is currently not set in `playwright.config.ts`. Adding
`forbidOnly: !!process.env.CI` is the one-line half of this task.
