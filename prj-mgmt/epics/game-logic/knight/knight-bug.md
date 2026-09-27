# [VOID] Knight a3 did not hint c1 / c3

## Summary

The knight e2e failed waiting for a hint on `c1`, and the scenario also expected `c3`
and a mirror hint on `h3`.

## Resolution: the test was wrong, not the code

`c1` and `c3` are **not** knight moves from `a3` — the L-moves from `a3` are `b1`,
`c2`, `c4` and `b5`. The scenario's `mustHints` list (`b1, b5, c1, c3, g4`) contained
three squares a knight can never reach from `a3`, and its expected hint total was
computed from a knight mirror move that
[the Mirror Portal spec](../../rules/mirror-portal-spec.md) §2 does not grant.

No engine defect existed. Closed by
[`reconcile-core-to-spec.md`](../../rules/reconcile-core-to-spec.md), which replaced
the scenario with a correct one (`src/mocks/mock-knight-moves.ts`) covering the four
real L-moves, an own-piece block and a capture, and asserting that nothing appears
across the seam.

## Note for future debugging

This failure sat unnoticed because a stray `test.only` in
`prj-mgmt/epics/game-logic/pawn/pawn-regular-move.e2e.ts` had silently reduced the
whole Playwright run to two tests. That `.only` has been removed.
