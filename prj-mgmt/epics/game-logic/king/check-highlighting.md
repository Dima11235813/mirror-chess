# Story — Check highlighting and feedback (UI)

> Carved out of [`check-king.md`](./check-king.md), whose engine criteria are done.
> Everything here is presentation: the rules are already settled in
> [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §10 and enforced by the
> engine. **No rule may be re-derived in the UI** (CLAUDE.md §2).

## Summary

As a player, I want the board to *show* me why I am in check and what I can do about
it, so that I understand the position rather than just finding fewer hints available.

## Acceptance Criteria

- [x] The checked king's square is visually marked, and the marking is also available
      non-visually (its `aria-label` says the king is in check) — CLAUDE.md §7 forbids
      visual-only cues.
- [x] The piece giving check is marked, and so is the path it attacks along. For a
      check through the seam, the path includes the far-side squares, so the player
      can see where it comes from.
- [x] Selecting the king shows only its legal escape squares (already true) and does
      not visually imply the blocked ones are merely "occupied".
- [x] Attempting an illegal move gives feedback explaining why, rather than silently
      doing nothing.
- [x] Portal destinations are distinguishable from ordinary ones.
      `SquareHintClass.Mirror` exists in `src/shared/ui/selectors.ts` and is still
      unused — this is where it gets used.
- [x] Checkmate and stalemate are visually distinct from an ordinary check, not only
      different footer text.
- [x] Works in both light and dark themes.

## How it was built

The view derives nothing. Two functions were added to the game core so the UI could
ask instead of computing:

- `checkingPieces(board, color)` — which enemy pieces are giving check (plural: a
  double check marks both).
- `checkPath(board, attacker, king)` — the squares the check travels through. For a
  portal check this returns the **whole journey**: the approach to the seam, the
  re-entry square, and the continuation. `w:Bb3; b:Kg1` yields `a2, h2, g1`, which is
  what makes an otherwise baffling check legible.

Presentation lives in `src/shared/ui/square-presentation.ts` as two pure, unit-tested
functions — `hintClassesFor` and `describeSquare` — so the accessible name and the
CSS class are decided in one place and cannot drift apart.

Portal hints are drawn as a **hollow ring** rather than a differently-coloured dot,
so they are distinguishable by shape as well as colour. Stalemate is deliberately
neutral grey rather than red: the game is drawn, not lost.

## Notes

The engine already exposed the rest:

- `isInCheck(board, color)` and `findKing(board, color)` — `src/game/attacks.ts`
- `gameStatus(state)` — `src/game/status.ts`
- `pseudoLegalMovesFor` — used to tell "your piece cannot reach that square" apart
  from "that move would expose your king", which is what the message explains.
- `legalMovesFor` already returns only legal moves

A "highlight the checking ray" feature needs the squares *between* the checker and
the king. With the portal that is not simply a straight line on the board, so derive
it from `attacksFrom` on the checking piece rather than by interpolating coordinates.

## Verification

| Command | Result |
| --- | --- |
| `npm run test` | **186 passed**, 2 skipped |
| `npm run build` | **clean** |
| `npx playwright test --workers=1` | **26 passed**, 2 skipped |

Verified visually in both themes: a portal check shows the ray leaving at `a2` and
re-entering at `h2`; portal hints render as rings against filled dots for ordinary
moves; checkmate reads distinctly from check in dark theme.

## Out of scope

An assistance/hint mode ("show all legal moves") — see
[`prevent-wrong-move.md`](../../user-moves/check/prevent-wrong-move.md).
