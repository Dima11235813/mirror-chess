# Epic — Puzzles

A puzzle game built out of this variant: a position, one right answer, and a reason the
answer only exists because of the seam.

---

## 1. Why this is a real product and not a side quest

The pitch is narrow and testable: **a puzzle that cannot exist in chess**. Not a chess
puzzle on a strange board — a position whose answer *changes* when the seam closes. That is
computable here and nowhere else, because this engine plays 64 games and one of them is
ordinary chess (CLAUDE.md §12).

It also fits where the project actually is. The variant study is blocked on evaluation —
the engine scores every quiet move identically, so self-play is 100% repetition draws
([`../balance/readiness-probe.md`](../balance/readiness-probe.md) §1). **Puzzle mining is
not blocked by that**, because a forced mate is a *rules fact*, proved by the perft-verified
generator, with no opinion from the evaluation anywhere in it. This epic can ship while the
engine work proceeds.

## 2. What was measured before building anything

2026-09-25, two candidate sources:

| Source | Cost/position | Forced mates | Seam mates |
| --- | --- | --- | --- |
| positions reached by random **play** | 223–1253 ms | ~2% | **0 of 5** |
| random **placement** of small material | 3–53 ms | 1–11% | many |

Game-like positions are a bad source, and the reason is a property of the game: the seam
makes kings hard to corner, so mates are rare in a crowded middlegame. The seam's own
mating patterns live in sparse endgames — where ~~**a lone bishop mates**~~ **a king walks
off one edge of the board and onto the other** (2026-10-03: the lone-bishop mate went away
with the crossing revision; the showcase shape now is a seam-crossing *king* move, and
`K+B vs K` is dead material), which chess cannot
do at all. Yield by material, 300 placements each:

| Material | Mates | Not a mate in chess |
| --- | --- | --- |
| K+Q vs K | 11% | 20 / 34 |
| K+B+B vs K+N | 10% | **30 / 31** |
| K+B vs K | 4% | **12 / 12** |
| K+N+B vs K | 2% | 7 / 7 |
| K+R vs K | 1% | 0 / 4 |

That last row is the control that makes the rest believable: a rook mates the same way here
as in chess, so none of its mates are novel — exactly as expected.

## 3. The four criteria a puzzle must pass

In `src/puzzles/mine.ts`, and each one exists because skipping it produces a broken puzzle:

1. **Legal and live** — the position is not already over.
2. **Exactly one solution** — a second answer means the UI rejects a correct move.
3. **No faster mate** — a position can have a unique mate in two *and* an immediate mate,
   in which case the "only answer" is not the best answer. This removes ~30% of otherwise
   usable candidates and was found only because the engine disagreed with the solver about
   a mined fixture.
4. **Not a mate in chess** — with every flag off it must not be a forced mate. This is the
   novelty gate, and the only defensible definition of novel we have.

## 4. How the puzzles are proved

**The miner never asks the engine.** It uses `src/puzzles/mate.ts`, an exhaustive solver
built on nothing but `allLegalMoves`, `reduceMove` and `gameStatus` — so a puzzle is exactly
as trustworthy as the published perft counts, and no engine bug can make one wrong. The
engine is used the other way round: `mate.test.ts` checks that the search *agrees* with the
solver, which is ADR 0002's two-implementations habit pointed at puzzles.

Every mined puzzle is then re-proved in `mine.test.ts`: the solution is replayed through the
rules against **every** defence, and the chess-differential is re-checked on the finished
record rather than trusted from the miner that wrote it.

## 5. Status

| | |
| --- | --- |
| [`mine-mate-in-2.md`](./mine-mate-in-2.md) | ✅ the miner, the solver, the criteria and the first committed set |
| [`puzzle-screen.md`](./puzzle-screen.md) | ✅ solve them: `?mode=puzzles`, the move played on the board, the seam route revealed after |
| Harder goals | 📋 mate in 3 (needs depth 5, ~10–40× the cost); "win material" is **blocked** on evaluation, since it rests on piece values known to be wrong here |
| [`difficulty-and-novelty.md`](./difficulty-and-novelty.md) | ✅ bands + diversity ranking. The engine-depth proxy turned out to be **dead** for a fixed goal; difficulty cannot be *predicted* without human data, so the bands are transparent features, never a rating |

| [`solve-logging.md`](./solve-logging.md) | 📋 opted-in solve data, pseudonymous by construction — the only real path to calibrated difficulty |

## 6. What would make this better, in order

1. **Mate in 3**, which is where puzzles get satisfying.
2. **Hints**, which would also give the set its first real difficulty signal — there is no
   human solve data, so hint usage is the honest proxy.
3. **Positions from real games** once self-play works, tagged `source: "selfplay"`, so the
   library can be compared: composed puzzles are fine in a puzzle book, but a position that
   demonstrably arose in play is a stronger claim.
