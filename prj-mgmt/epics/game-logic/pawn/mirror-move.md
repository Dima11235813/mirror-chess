# Pawn – Mirror Move (pushes never wrap)

> Specified in [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §11.2 and
> delivered by [`stepper-portal.md`](../../rules/stepper-portal.md).

Pawns cross the seam, but only on their **capture** diagonals — see
[`mirror-attack.md`](./mirror-attack.md). A pawn *push* has no file component, so
there is nothing for the seam to act on.

## Acceptance Criteria

- [x] A pawn push never wraps: a pawn on `a3` has exactly one non-capturing move,
      `a4`. Pawns still cannot move sideways.
- [x] The seam neither shortens nor lengthens a pawn's journey to promotion.
- [x] The opposite-file same-rank square `(7 - f, r)` is never offered to a pawn.
- [x] A lone pawn on an edge file therefore has **no** move flagged `mirror`.

## Test Cases

- [x] `w:Pa3` → `a4` only; no mirror move.
- [x] `w:Pa4` → the attack set is `b5, h5`, and `h4` is never among them.

## Verified by

- Unit: `src/game/mirror-portal.test.ts`, `src/game/attacks.test.ts`
- E2E: `prj-mgmt/epics/rules/mirror-portal.e2e.ts`

## Still deferred

Promotion and en passant (spec §8.4). En passant additionally needs last-move state
in `GameState`, which does not exist yet — see
[`mirror-en-passant.md`](./mirror-en-passant.md).
