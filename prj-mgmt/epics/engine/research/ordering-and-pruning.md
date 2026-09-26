# Research — move ordering & pruning

> Fan-out stream 4 of 5, 2026-08-02. See [`README.md`](./README.md) for the CPW-503
> caveat. Stockfish `movepick.cpp` / `position.cpp` were read first-hand; the
> safe-vs-forward-pruning definition is quoted from a CPW search snippet, not the page.

## Why ordering is the whole ballgame

Ordering never changes alpha-beta's answer, only its cost — and the cost swing is
enormous. With perfect ordering alpha-beta visits `O(b^(d/2))`; pessimal ordering
degrades to plain minimax `O(b^d)`; random gives `Θ((b/2)^d)`. Worked case at 4 ply,
b=36: **>1M leaves naive versus ~2,000 optimally.**

The diagnostic to instrument is **the fraction of beta-cutoffs occurring on the first
move tried**. If that number is not high, ordering is broken regardless of what the
node count looks like.

Stockfish's staged order (`movepick.cpp`):

```
MAIN_TT → CAPTURE_INIT → GOOD_CAPTURE → QUIET_INIT → GOOD_QUIET → BAD_CAPTURE → BAD_QUIET
EVASION_TT → EVASION_INIT → EVASION        (in check: no capture/quiet split)
```

Classic readable equivalent, and what to copy: **TT/PV move → winning and equal captures
(MVV-LVA) → promotions → 2 killers → counter-move → history-sorted quiets → losing
captures.**

## SEE, and the four ways a seam breaks it

Static Exchange Evaluation resolves an exchange on one square: repeatedly capture with
the least valuable attacker, build a swap list, negamax it backwards with stand-pat
allowed. Stockfish's `see_ge` removes the mover and victim from occupancy, then
**re-derives attackers from the target square after each removal** to pick up x-rays.

X-ray and battery handling is already subtle in chess. Under a seam:

1. **`attackersTo(sq)` must use the same ray walker as movegen.** The classic variant bug
   is movegen crossing the seam while attack detection does not — SEE then misses a
   defender and reports a hanging piece. Derive it from the shared geometry, never from
   a second hand-written loop.
2. **Never use the "extend the ray past the removed square" x-ray trick.** In chess a
   diagonal is a straight line so uncovering an x-ray is a masked lookup; across a seam
   **the line bends**. The only correct approach is to recompute
   `slidingAttacksFrom(to, occupied)` from scratch after each removal. That is also the
   readable choice.
3. **Ranks are cycles → termination *and* de-duplication.** A rook's rank walk must be
   bounded or the re-scan loops forever. Worse: **the same rook can reach the target from
   both directions**, so `attackersTo` must return a **set of squares** — otherwise SEE
   lets one rook capture twice and reports a fictitious material win.
4. **Self-batteries through the seam are routine, not exotic.** Two rooks on a rank
   defend each other from opposite directions. Recompute-from-scratch handles it;
   incremental x-ray does not. Pins bend too, so blocker/pinner detection must go through
   the same walker.

## MVV-LVA is safe with wrong piece values; SEE is not

MVV-LVA needs only an **ordinal** ranking, and it is pure ordering — wrong values cost
nodes, never correctness. Ship it now on placeholder ordinals (P < N ≈ B < R < Q),
accepting that in this variant B may really outrank R.

SEE is the opposite: it feeds **pruning** decisions, so mis-valued bishops would cause
genuinely good captures to be pruned in quiescence.

> **Recommendation: use SEE for ordering only in v1. Do not let it prune until piece
> values are measured.** This reconciles the apparent disagreement with
> [`search.md`](./search.md), which advises against SEE in v1 — that advice targets SEE
> *as a pruning input*, and both streams agree it must not prune on guessed values.

## SAFE vs UNSAFE against "same result as plain negamax"

| Technique | Verdict |
| --- | --- |
| Any move ordering (TT move, MVV-LVA, killers, counter-move, history) | **SAFE** — score identical |
| Fail-soft alpha-beta | **SAFE** |
| PVS / null-window with full re-search on fail-high | **SAFE** |
| Aspiration windows | **SAFE in isolation**; unsafe once a TT stores bounds produced under the narrow window |
| TT for **ordering only** | **SAFE** |
| TT for **cutoffs** | **CONDITIONAL** — needs `entry.depth ≥ remaining` and correct bounds; still diverges via deeper-entry reuse and graph-history interaction |
| Quiescence search | **VIOLATES** by design — it extends beyond fixed depth |
| Null-move pruning | **UNSAFE** (zugzwang) |
| Late move reductions | **UNSAFE** — even with fail-high re-search, a wrong *fail-low* is never re-searched |
| Futility / reverse futility / razoring | **UNSAFE** |
| Late-move / movecount pruning | **UNSAFE** |
| SEE-based capture pruning | **UNSAFE** |
| Delta pruning (qsearch) | **UNSAFE** |

Everything UNSAFE sits behind a flag defaulting to off, or is deferred.

> ### Second correction to `engine-core.md`
>
> **Alpha-beta returns *a* best move, not *the* best move.** Reordering changes which of
> several equal-scoring moves wins, so "same move as plain negamax" is not testable as
> written. Fix it one of two ways: assert `bestMove ∈ optimalMoves(negamax)`, or make
> both searchers use a strict `>` update plus a deterministic final tie-break (lowest
> `from`, then `to`) so plain equality holds.
>
> This is independent of the TT flaw found in [`search.md`](./search.md). Both bear on
> the same acceptance criterion.

## Build order, with verification per step

```
1. Fail-soft alpha-beta + iterative deepening            (safe)
2. Ordering v1: previous-iteration PV move → MVV-LVA → promotions → quiets   (safe)
3. Killers (2/ply) + butterfly history [side][from][to]  (safe)
4. TT (Zobrist), best-move-only — ordering, no value cutoffs                 (safe)
5. Seam-aware SEE, used ONLY to sort captures            (safe)
6. Quiescence (captures + promotions)                    -- flag, own oracle
7. NMP / LMR / futility / delta                          -- deferred, flags, A/B only
```

One `search.equivalence.test.ts` over a fixture battery (start position, seam-heavy,
in-check, near-mate) × depths 1–4: assert `alphaBeta(p,d).score === negamax(p,d).score`
and identical best move under the deterministic tie-break. **Steps 1–5 must all pass it
unchanged** — that is the entire point of restricting v1 to safe techniques.

Add **node-count upper-bound assertions** per step, or a correct-but-useless ordering
passes silently. SEE gets its own unit tests: seam batteries, a rook attacked along a
rank from both directions (must not double-count), and an attacker arriving only via a
seam hop. Step 6+ get tactical-suite oracles, never negamax equivalence.

## Geometry assumptions the seam invalidates

- **PSTs / centralisation** — a4 knight = 8 attacks = d4 knight.
- **Colour complexes** — bishops are not colour-bound, so bad-bishop and
  colour-weakness terms are meaningless.
- **King safety / pawn shield / "block the rank"** — a rank is a cycle; a rook cannot be
  shut out of a rank by one blocker.
- **King distance / mop-up eval** — file distance must use the **seam metric** (`a` and
  `h` adjacent); Chebyshev on raw file index is simply wrong.
- **Rook behind the passer** — rooks reach along the cycle, so the term miscomputes even
  though pawns do not cross in v1.
- **Delta and futility margins** assume the maximum single-move swing is a queen and
  that few pieces bear on a square; seam sliders multiply simultaneous attackers, so
  chess-tuned margins are too tight.
- **Null move** — "pass" is more often catastrophic here because the opponent's attacking
  geometry is richer; assume NMP error rates are worse than in chess.

**Safe to inherit unchanged:** killers, counter-move, history/butterfly tables, MVV-LVA
— all indexed by from/to squares or piece types, with no geometric assumption.

## Sources

- Alpha–beta complexity bounds and the 4-ply example: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning
- Stockfish `movepick.cpp` (stage order, capture/quiet scoring): https://github.com/official-stockfish/Stockfish/blob/master/src/movepick.cpp
- Stockfish `position.cpp` `see_ge()` (swap logic, x-ray re-add, pin filter): https://github.com/official-stockfish/Stockfish/blob/master/src/position.cpp
- SEE explained: https://www.chessprogramming.net/static-exchange-evaluation-in-chess/
- MVV-LVA table: https://paulwebster.net/mvv-lva-move-ordering/
- CPW (503, unread): Move_Ordering, SEE_-_The_Swap_Algorithm, Pruning
