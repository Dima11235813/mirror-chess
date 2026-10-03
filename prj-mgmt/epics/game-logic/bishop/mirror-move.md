# Bishop – Mirror Move (portal)

> **Status: SUPERSEDED twice, and kept as a record of both.**
>
> 1. The original version described a *same-rank file mirror* (`b3 → g3`), which was never
>    confirmed and never the mechanic.
> 2. It was then rewritten against spec §4–§5.2 as a **rank-preserving hop** — the criteria
>    below, including "the seam hop does not change rank: leaving via `a4` emerges on `h4`,
>    never `h5`". **That was reversed on 2026-10-03.** A crossing continues the diagonal:
>    `a4` leads to `h5`, and square colour is preserved.
>
> The live rules are [the spec](../../rules/mirror-portal-spec.md) §4; the migration is
> [`diagonal-crossing.md`](../../rules/diagonal-crossing.md). Nothing below is current. It
> is kept because this story is the clearest surviving record of a rule being written down
> confidently, implemented, tested, and still being wrong — which is the thing this project
> keeps learning.

## Summary

As a player, when I select a bishop, I want each of its diagonals that reaches the
`a`- or `h`-file with a clear path to continue through the seam onto the far side of
the board, so that I can use the mirror portal for attack and development.

## Acceptance Criteria

- [x] Given a bishop whose diagonal reaches the `a`-file (or `h`-file) with every
      square on the way empty, and that edge square is empty, then the ray continues
      from the mirrored edge square **on the same rank**, and every square it reaches
      is highlighted as a mirror move.
- [x] The seam hop does not change rank: leaving via `a4` emerges on `h4`, never `h5`.
- [x] The far-side walk continues in the **same direction** as the original diagonal.
- [x] Given a blocker anywhere on the ray before the edge square, no mirror move is
      highlighted for that ray.
- [x] Given a piece on the edge square itself, no mirror move is highlighted for that
      ray (an enemy there is an ordinary capture that stops the ray).
- [x] A square reachable both normally and through the seam is highlighted once, as a
      normal move.

## Test Cases

- [x] `w:Bb3` → mirror hints on `h4, g5, f6, e7, d8` (via `a4`) and `h2, g1` (via `a2`).
- [x] `w:Bc1` → mirror hints on `h3, g4, f5, e6, d7, c8` (via `a3`) and `a6, b7` (via
      `h6`); `c8` appears once.
- [x] `w:Bc1,Ng5` → the right-hand portal is gone; the left-hand one is unaffected.

## Verified by

- Unit: `src/game/bishop.test.ts`, `src/game/mirror-portal.test.ts`
- E2E: `bishop-move.e2e.ts` (this folder), `prj-mgmt/epics/rules/mirror-portal.e2e.ts`
