# Pawn – Mirror Attack (capture diagonal wraps)

> Specified in [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §11.2,
> §11.6 and delivered by [`stepper-portal.md`](../../rules/stepper-portal.md).
>
> **The earlier version of this story is rejected.** It had a pawn projecting a
> capture onto the file mirror of some square ahead of it — and the code, the story
> text and the e2e each described that differently. Under §11 a pawn's capture
> diagonal simply wraps the file, like every other stepper.

## Summary

As a player, I want a pawn's diagonal capture to wrap across the seam, so that
a- and h-file pawns are no longer weaker than every other pawn.

## Acceptance Criteria

- [x] A pawn's two capture diagonals are computed with the file wrapped:
      `newFile = (file ± 1 + 8) mod 8`, rank one step forward for its colour.
- [x] A wrapped capture is offered only when an enemy piece is on the destination,
      exactly as for an ordinary pawn capture, and is flagged `special: 'mirror'`.
- [x] Every pawn therefore has two capture squares — the a/h-file asymmetry of
      standard chess is gone.
- [x] A wrapped pawn attack gives check.
- [x] Pawn attack diagonals wrap even though pawn pushes do not.

## Test Cases

- [x] `w:Pa4` attacks `b5` and `h5`.
- [x] `w:Ph4` attacks `g5` and `a5`.
- [x] `w:Pa4; b:Rh5` → `h5` is offered as a mirror capture.
- [x] `w:Pa4; b:Kh5` → black is in check.
- [x] Black mirrors this: a black pawn on `h5` captures onto `g4` and `a4`.

## Verified by

- Unit: `src/game/attacks.test.ts`, `src/game/mirror-portal.test.ts`
- E2E: `prj-mgmt/epics/rules/mirror-portal.e2e.ts`
