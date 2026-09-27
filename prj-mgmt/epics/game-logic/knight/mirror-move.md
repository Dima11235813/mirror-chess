# Knight – Mirror Move (L measured across the seam)

> Specified in [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §11 and
> delivered by [`stepper-portal.md`](../../rules/stepper-portal.md).
>
> **The earlier version of this story is rejected, not implemented.** It described a
> *file mirror on the same rank* (`a3 → h3`) that ignored blockers. The owner instead
> chose the L measured across the seam, which sends `a3` to `h5, g4, g2, h1` and
> never to `h3`.

## Summary

As a player, I want a knight's L-shaped jump to continue through the seam, so that a
knight on the edge files keeps all eight of its moves instead of losing half of them
to the board edge.

## Acceptance Criteria

- [x] A knight's destination file wraps across the seam:
      `newFile = (file + df + 8) mod 8`; its rank is whatever the L dictates.
- [x] Ranks never wrap — an L that needs a rank off the board yields no move.
- [x] A destination reached by wrapping is flagged `special: 'mirror'`.
- [x] Blockers are irrelevant, as ever: a knight jumps, and a wrapped jump has no
      intervening squares either.
- [x] The destination must be empty or hold an enemy; an own piece blocks it.
- [x] A knight away from the edge files is completely unaffected.

## Test Cases

- [x] `w:Na3` → `b5, c4, c2, b1` (standard) and `h5, g4, g2, h1` (mirror) — 8 moves.
- [x] `w:Nh6` → `g8, f7, f5, g4` and `a8, b7, b5, a4`.
- [x] `w:Na1` → `b3, c2` and `g2, h3` — the corner knight gains two moves it would not
      have in standard chess.
- [x] `w:Na3` never offers `h3`.
- [x] `w:Na3,Ph5` → `h5` is blocked by the own pawn.
- [x] `w:Na3; b:Ph5` → `h5` is a mirror capture.

## Verified by

- Unit: `src/game/knight.test.ts`, `src/game/mirror-portal.test.ts`
- E2E: `board.e2e.ts` (this folder), `prj-mgmt/epics/rules/mirror-portal.e2e.ts`
