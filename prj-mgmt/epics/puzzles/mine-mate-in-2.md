# Story — Mine mate-in-2 puzzles that chess cannot produce

> **Status: DONE (2026-09-25); the set was re-mined and the criteria gained a fifth on
> 2026-10-03.** Part of the [puzzles epic](./README.md). `src/puzzles/mate.ts` (solver),
> `mine.ts` (criteria and generation), `scripts/mine-puzzles.ts` (CLI), and a committed set
> at `puzzles/puzzles.v3.json`.
>
> **What the crossing revision did to this story** —
> [`../rules/diagonal-crossing.md`](../rules/diagonal-crossing.md) M4, and it is the
> harshest test the mining machinery has had:
>
> - **255 of 285 shipped puzzles lost their forced mate** and were removed. Only 30 survive.
> - The **material sets were re-measured and re-chosen**: `K+B vs K`, the marquee shape,
>   became *dead material*, and `K+B+B vs K+N`, the densest source, now yields nothing.
> - A **fifth criterion** was added, and it is a defect this story shipped twice:
>   `blackAlreadyInCheck`. See §2.

## Summary

As the owner, I want a reproducible library of mate-in-2 puzzles whose answers exist only
under mirror rules, so that there is a game to play that teaches the seam — and one that
does not wait on the evaluation work.

## 1. Acceptance Criteria

- [x] An exhaustive mate solver built **only** on the rules layer, so puzzles are as
      trustworthy as the perft counts and inherit no engine bugs.
- [x] ~~Four criteria~~ **Five** criteria, each enforced and each tested: legal and live,
      **the side not to move is not in check** (added 2026-10-03, §2), exactly one solution,
      no faster mate, and the chess differential — which since 2026-09-26 is a *label* rather
      than a rejection.
- [x] Mining is **seeded and reproducible** — same seed, same puzzles, byte for byte.
- [x] Pawns are never placed on ranks 1 or 8: an illegal position is not a hard puzzle.
- [x] Every puzzle in a mined batch is re-proved from its record: the solution is replayed
      through `reduceMove` against **every** defence, and the chess-differential re-checked.
- [x] The miner reports *why* candidates were rejected, so a disappointing run can be
      diagnosed rather than guessed at.
- [x] A `npm run mine:puzzles` entry point that needs no new dependency (`vite-node` ships
      with vitest and resolves the repo's path aliases).
- [x] A committed puzzle set, with the seed that produced it.

## 2. What we learned

### 42% of both shipped sets were illegal positions — found 2026-10-03

A candidate was rejected if the game was already over, but **nothing asked whether the side
*not* to move was in check** — a position no legal previous move could have produced. Two
kings standing next to each other passes every other criterion, and the solver will happily
prove a mate in it.

Measured across both sets: **121 of 285** in the pre-revision set and **100 of 238** in the
first re-mine — about 42% each time, so this is a long-standing defect and not something the
crossing revision caused. Rook-heavy material makes it worse (a loose rook checks a lone
king from a long way off), which is why the new material list made it impossible to miss.

How it was found is the part worth keeping: **by reading one record closely enough to
notice two kings touching**, while picking a fixture for a component test. Not by a test.
Four criteria, a schema, a re-proof of the shipped artifact and forty-odd tests all agreed
with each other, because every one of them asked about the *mate* and none asked whether
the position was a position.

So the guard now exists in both places it can fail: `evaluateCandidate` rejects the
candidate, and `puzzle-set.test.ts` rejects the **artifact** — because a set can also arrive
hand-edited, or from an older miner.

> **The general shape:** a generator and its validator written by the same author in the
> same sitting share the same blind spot. `src/game/*` is the oracle for move *legality*;
> nothing was the oracle for *position* legality, and the criteria never thought to ask.

**The engine disagreeing with the solver found a real defect — in the criteria, not the
code.** The first mined fixture, `Ke4,Bc3,Be2 / Ke1,Nc8`, was a unique mate in two *and* a
mate in one. The solver was right (it answers exactly what it is asked) and the engine was
right (it reported mate in 1), and the *puzzle* was wrong: a player who mated immediately
would have been marked incorrect. Adding "no faster mate" removed **4 of 14** otherwise
usable candidates — a 29% defect rate that no amount of green tests would have surfaced,
because every test agreed with the miner that made them.

That is the ADR 0002 habit paying off in an unplanned direction: the second implementation
is not only a check on the first, it is a check on the *question*.

**Random play is the wrong source, and the reason is a property of the game.** Positions
from random play yielded ~2% mates and zero seam mates, at 10–100× the cost of sparse
placements. Kings are hard to corner when the edge file wraps, so mates are rare where the
board is crowded. Everything interesting is in the endgame — which is also where the lone
bishop mate lives, the one shape chess cannot produce at all.

**The control set matters as much as the productive ones.** `K+R vs K` yields mates and
**none** of them are novel: a rook mates here exactly as it does in chess. Keeping it in
the material list is what makes the other rows credible.

## 3. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/puzzles/mate.test.ts` | mate in one and two; stalemate and mate-in-one rejected; uniqueness; the lone-bishop differential; the engine agreeing with the solver |
| Unit | `src/puzzles/mine.test.ts` | placement legality; determinism; dedupe; every puzzle re-proved against every defence; the novelty gate re-checked on the record |

Both are slow by unit-suite standards — roughly **20 seconds** for `mine.test.ts`, since
mining costs ~50 ms per candidate. Recorded here so nobody deletes them later for being
slow (CLAUDE.md §8).

## 4. Known limits, stated plainly

- **Composed, not played.** Positions come from random placement, so some look like studies
  rather than games. Chess puzzle books are full of composed positions, but it is a visible
  difference and the owner chose it knowingly.
- **No difficulty rating.** There is no human solve data and no proxy yet.
- **Mate in 2 only.** Mate in 3 needs depth 5 and roughly 10–40× the compute.
- **Yield is ~1–2% of candidates**, so a large library is a long run rather than a hard one.

## Definition of done

A seeded miner that produces puzzles proved against the rules layer, every one of them a
forced mate here and not in chess, with a committed set and a reproducible seed.
