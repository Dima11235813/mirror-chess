# Story — The stepper portal (Knight, King, Pawn)

> Implements §11 of [`mirror-portal-spec.md`](./mirror-portal-spec.md), which is the
> oracle. Follows [`legality-layer.md`](./legality-layer.md).

## Summary

As a player, I want knights, kings and pawns to cross the mirror seam too — the
knight's L measured across it, the king's step wrapping the file, the pawn's capture
diagonals wrapping — so that the seam is a property of the whole board rather than a
slider-only trick.

## The decision behind it

The owner chose, from explicit options on 2026-07-30:

- **Knight:** "L-shape measured across the seam" — a move that would run off the
  a-file re-enters on the h-file, keeping the rank its L dictates.
- **King and pawn:** both cross as well.

The old notes' knight idea (`a3 → h3`, the file mirror on the same rank) was **not**
chosen and is now explicitly rejected in the spec.

## Scope

**In:** stepper move generation, stepper attack generation (so a wrapped knight or
pawn gives check), and the tests and fixtures that asserted steppers do not cross.

**Out:** castling, promotion, en passant (§8.4); notation (§8.5). The slider
crossing (§4) is untouched.

## Acceptance Criteria

### The rule (spec §11.2)
- [x] A stepper's destination file wraps: `newFile = (f + df + 8) mod 8`.
- [x] Its rank is `r + dr` and **never wraps** — a rank off the board means no move.
- [x] A destination reached by wrapping is flagged `special: 'mirror'`; one that stays
      on the board is not, so standard chess is unchanged.
- [x] Ordinary occupancy still applies: empty → move, enemy → capture, own → nothing.
- [x] At most one crossing, which is free given `|df| <= 2`.

### Per piece (spec §11.4)
- [x] Knight `a3` → `b5, c4, c2, b1` plus `h5, g4, g2, h1` — eight moves, and **not**
      `h3`.
- [x] Knight `h6` → `g8, f7, f5, g4` plus `a8, b7, b5, a4`.
- [x] King `a3` → `a4, a2, b4, b3, b2` plus `h4, h3, h2`.
- [x] A pawn **push** never wraps; a lone pawn on `a3` has only `a4`.
- [x] A pawn **capture** diagonal does wrap: `w:Pa4; b:Rh5` offers `h5`.

### Attacks and legality (spec §11.6)
- [x] A knight on `a3` attacks `h5` and gives check to a king there — and does **not**
      give check on `h3`.
- [x] A pawn on `a4` attacks `h5` and gives check to a king there.
- [x] A king on `a1` attacks `h1` and `h2`.
- [x] Wrapped moves are filtered by king safety exactly like any other move.

### Consequences that must hold (spec §11.5, §11.6)
- [x] A king on `a4` steps north-west to `h5`, while a bishop on `a4` reaches `h4`
      and then `g5` — the two crossings differ by design.
- [x] The opening position still has **no** portal move: every wrapped destination is
      either occupied by an own pawn or an empty square a pawn may not move to.
- [x] Kings can no longer be cornered against the edge file. Positions that used to be
      mate are only check when the king can wrap to safety.

### Non-regression
- [x] Every §4/§5 slider test passes unchanged.
- [x] `npm run test` and `npm run build` clean; e2e green.

## Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/knight.test.ts` | §11.4 knight, both directions, occupancy, corner |
| Unit | `src/game/mirror-portal.test.ts` | §11 block: knight, king, pawn, and the §11.5 divergence |
| Unit | `src/game/attacks.test.ts` | §11.6 wrapped attacks and the checks they give |
| Unit | `src/game/status.test.ts` | mate/stalemate re-derived under the new rule |
| E2E | `prj-mgmt/epics/rules/mirror-portal.e2e.ts` | knight, king and pawn crossings in the UI |
| E2E | `prj-mgmt/epics/game-logic/knight/board.e2e.ts` | the knight scenario fixture |

## Verification

| Command | Result |
| --- | --- |
| `npm run test` | **192 passed**, 2 skipped |
| `npm run build` | **clean** |
| `npx playwright test --workers=1` | **29 passed**, 2 skipped |

### Positions that had to be re-derived

Three previously-passing tests broke **because the rules changed**, not because of a
defect — the clearest possible evidence the new rule bites:

1. The back-rank mate `w:Ka1,Ra8; b:Kh8,Pg7,Ph7` is now only *check*: the black king
   wraps `h8 → a8` and captures the rook. Replaced with a mate on `g8`, off the seam,
   and the old position kept as a test that the escape works.
2. The stalemate `w:Kf7,Qg6; b:Kh8` likewise dissolves — `h8 → a8` is legal.
   Replaced with `w:Ka1,Qf6,Rh1; b:Kg8`.
3. The portal mate `w:Ka8,Ra1,Nd1,Rb2; b:Kh1` dissolved because the king could wrap
   onto `a1` and take the rook. Restored by adding `Nb3`, which defends `a1`.

## Definition of done

Every piece crosses the seam by a rule written down before it was coded, the §11.4
worked examples run as tests, and no fixture or story still claims steppers stay on
their own side.
