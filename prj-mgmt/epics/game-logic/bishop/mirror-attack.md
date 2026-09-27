# Bishop – Mirror Attack (portal capture)

> Rewritten against [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §4, §6.
> The previous version described a same-rank file-mirror capture; that rule was never
> confirmed and is not the mirror mechanic.

## Summary

As a player, I want a bishop's portal ray to capture the first enemy piece it meets
on the far side of the seam, so that I can attack pieces that are unreachable by
standard diagonals.

## Acceptance Criteria

- [x] Given a bishop's ray portals through the seam, the far-side walk stops at the
      first occupied square; if that piece is an enemy, the square is highlighted as a
      capture with `special: 'mirror'`.
- [x] Squares beyond that capture on the same ray are not highlighted.
- [x] Given the first piece on the far side is my own, no mirror move is highlighted
      there, and the ray stops before it.
- [x] Given an enemy sits on the **edge square**, that is an ordinary capture which
      stops the ray — there is no portal past it.
- [x] The origin square terminates the far-side walk (no self-capture, no loop).

## Test Cases

- [x] `w:Bc1; b:Na6` → `a6` is a mirror capture; `b7` and `c8` beyond it are not shown.
- [x] `w:Bc1,Pa6` → `a6` is not highlighted at all.
- [x] `w:Rd4; b:Pa4` → `a4` is a normal capture and yields no mirror hints.

## Verified by

- Unit: `src/game/bishop.test.ts`, `src/game/mirror-portal.test.ts` (§6 block)
- E2E: `bishop-move.e2e.ts` (this folder)
