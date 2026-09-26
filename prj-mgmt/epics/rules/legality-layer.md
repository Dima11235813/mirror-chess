# Story — Legality layer (check, self-check filtering, pins, mate)

> Implements §10 of [`mirror-portal-spec.md`](./mirror-portal-spec.md), which is the
> oracle. Follows [`reconcile-core-to-spec.md`](./reconcile-core-to-spec.md).

## Summary

As a player, I want the board to offer only *legal* moves — never one that leaves my
own king in check, including check delivered through the mirror seam — and to tell me
when I am in check, checkmated or stalemated, so that the game enforces the rules
instead of relying on me to track them.

## Scope

**In:** attacked-square generation, check detection, self-check filtering of
`legalMovesFor`, checkmate / stalemate detection, and the minimum UI wiring to
surface the resulting state (`inCheck` is already in `GameState` and already rendered
by `App.tsx`, but nothing ever sets it).

**Out:** castling, promotion, en passant (spec §8.4); draws by repetition / 50-move /
insufficient material (§10.4); check notation (§8.5); the check-*highlighting* UI
asks in `epics/game-logic/king/check-king.md` — those are a separate UI story.

## Acceptance Criteria

### Attacked squares (spec §10.1)
- [x] Pawns attack both forward diagonals **unconditionally**; a pawn push is not an
      attack.
- [x] Knight and king attack their whole step set regardless of occupancy.
- [x] Sliders attack along their rays, stopping at — and including — the first
      occupied square.
- [x] **Portal rays attack.** A bishop on `b3` attacks `h4, g5, f6, e7, d8, h2, g1`,
      so a king on any of them is in check.
- [x] The §4 portal preconditions hold for attacks: the edge square must be reachable
      with a clear path and be empty; an enemy on the edge square is an ordinary
      attack that stops the ray.

### Check (spec §10.2)
- [x] A side is in check when its king's square is attacked by the opponent.
- [x] A position with no king of that color is never in check — partial test
      positions such as `w:Bb3` stay unfiltered.

### Legal moves (spec §10.3)
- [x] `legalMovesFor` returns only moves after which the mover's own king is not
      attacked.
- [x] A king cannot move along a checking ray away from the checker.
- [x] A king cannot capture a defended piece.
- [x] A pinned piece cannot abandon the pin, but may move along it, including
      capturing the pinner.
- [x] While in check, only moves that resolve it are offered — capture the checker,
      block its path (near **or** far side of the seam), or move the king.
- [x] `reduceMove` rejects an illegal move and returns the state unchanged.
- [x] `GameState.inCheck` reflects whether the **side to move** is in check, after
      every applied move and for every constructed position.

### Terminal states (spec §10.4)
- [x] Checkmate is reported when the side to move is in check with no legal move.
- [x] Stalemate is reported when the side to move is not in check with no legal move.
- [x] A mirror-portal checkmate is detected the same as any other.

### UI
- [x] The footer states check / checkmate / stalemate rather than only "(check)".
- [x] No move can be made once the game is over.
- [x] The status is conveyed non-visually (not colour-only) per CLAUDE.md §7.

### Non-regression
- [x] All 30 spec-oracle tests in `mirror-portal.test.ts` still pass unchanged —
      filtering must be a no-op on kingless positions.
- [x] `npm run test` and `npm run build` clean; e2e green.

## Design notes

`legalMovesFor` must filter without recursing through the reducer. Split generation
from filtering:

- `pseudoLegalMovesFor` — today's §4 generator, unchanged.
- `legalMovesFor` — filters by applying each move to a board and asking whether the
  mover's king is attacked, using **pseudo-legal** attack generation for the opponent
  (sufficient and standard: an opponent reply that would expose their own king still
  captures ours first).

Evaluating legality on the board *after* the move is what makes the king-along-the-ray
and defended-piece cases correct for free; do not try to special-case them.

Module layout to avoid an import cycle (`moves` ↔ `attacks`):

```
types → coord → rays (directions, portalMouth)
                 ├→ attacks (attacksFrom, isSquareAttacked, findKing, isInCheck)
                 └→ moves   (pseudoLegalMovesFor, legalMovesFor)  → status → reducer
board (applyMoveToBoard) is shared by moves and reducer
```

## Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/attacks.test.ts` | §10.1 — pawn/knight/king/slider attack sets, portal attacks |
| Unit | `src/game/legality.test.ts` | §10.2–10.3 — check, self-check, pins, mirror check resolution |
| Unit | `src/game/status.test.ts` | §10.4 — checkmate, stalemate, mirror-portal mate |
| Unit | `src/game/mirror-portal.test.ts` | unchanged — proves filtering is a no-op without kings |
| E2E | `prj-mgmt/epics/rules/legality.e2e.ts` | a pinned piece offers no illegal hint; mate is announced |

## Verification

| Command | Result |
| --- | --- |
| `npm run test` | **162 passed**, 2 skipped (was 111 — 51 new) |
| `npm run build` | **clean** |
| `npx playwright test --workers=1` | **18 passed**, 2 skipped |
| `npm run test:int` | 13 failed / 40 passed — unchanged, pre-existing component debt |

An earlier e2e run failed once on `bishop-move.e2e.ts` with `page.goto` timing out;
that file passed on its own and the full suite passed on re-run. It is the
intermittent server-timing problem tracked in
[`task-e2e-parallelism.md`](./task-e2e-parallelism.md), not a legality regression.

The 30 spec-oracle tests in `mirror-portal.test.ts` passed **unchanged** throughout,
which is the evidence that legality filtering is a no-op on kingless positions.

### Beyond the original scope

- `reduceMove` now also refuses to move a piece belonging to the side not on turn.
  It previously allowed it; only `BoardView` prevented it, so the rule was enforced
  in the UI rather than the engine — which CLAUDE.md §2 forbids.
- `fromPiecesSpec` computes `inCheck` instead of hardcoding `false`, so a position
  loaded from a URL reports check correctly.
- The UI asks that were mixed into `epics/game-logic/king/check-king.md` are carved
  out into `check-highlighting.md`; the engine criteria there are now ticked.

## Definition of done

The engine never offers a move that leaves its own king attacked, check through the
seam is detected exactly like check on the near side, mate and stalemate are
reported, and §10 has an executable oracle.
