# [RESOLVED] Bishop kept sliding past a capture

## Summary

Selecting `Bc1` with a black pawn on `e3` highlighted `f4`, `g5` and `h6` — squares
behind the capture. The bishop's ray did not stop at the first enemy piece.

## Repro

Load `?board=w:Bc1; b:Pe3&turn=white`, click `c1`.

- **Expected:** hints on `d2`, `e3` (capture), `b2`, `a3` only.
- **Actual:** `f4`, `g5`, `h6` were also hinted.

## Cause

`diagonalPortalWrap` walked each diagonal to the seam using its own occupancy check
and emitted far-side squares independently of the standard ray, so a blocker on the
ray did not always stop the squares beyond it. The function was one of the
contradictory portal implementations described in
[the Mirror Portal spec](../../rules/mirror-portal-spec.md) §9.

## Resolution

Fixed by [`reconcile-core-to-spec.md`](../../rules/reconcile-core-to-spec.md), which
re-derived move generation from the spec: a single `slideMoves` walk stops at the
first piece, and `portalMoves` only runs when the ray reaches an empty edge square
with a clear path.

**Regression cover:** `src/game/bishop.test.ts` ("Bc1 with a black pawn on e3") and
the `Regular attack` case in `bishop-move.e2e.ts`.
