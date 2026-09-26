# Research — search architecture

> Fan-out stream 3 of 5, 2026-08-02. See [`README.md`](./README.md) for the CPW-503
> caveat. Load-bearing details here were verified against primary source that *was*
> opened: Stockfish `search.cpp` / `position.cpp`, Ethereal `search.c`.

## The skeleton, and why to build it in this order

`minimax → negamax → alpha-beta → iterative deepening → PVS`. **Each step is
value-preserving, which is exactly what makes it testable** — see the invariants below.

Iterative deepening is not wasteful: the tree is geometric, so with branching factor ~35
every iteration before the last sums to roughly `1/(b−1) ≈ 3%` of the final one. It then
*pays for itself*, because the depth-(d−1) best move seeded into the TT makes depth-d
ordering near-optimal, and alpha-beta only collapses from `b^d` to `~b^(d/2)` **under
good ordering**. ID + TT is net faster than a single deep search, and it gives an
anytime result, which time management requires.

Keep **mate-distance pruning** in v1 — cheap, safe, three lines.

## Quiescence

Standard structure: stand-pat, then tactical moves only, with delta pruning (~200cp).
v1 move set: **captures and promotions only.** Checks in qsearch are a classic explosion
source and need their own depth cap.

**Where a chess-shaped quiescence goes silently wrong for us:**

- `tacticalMoves()` must come from the **same variant generator** as the main search.
  Any "walk the 8 standard directions to find captures" shortcut misses seam captures —
  a bishop on `b3` capturing on `e7` is a qsearch-visible tactic.
- Check detection and evasion generation must be variant-aware. **Never use a
  `squaresBetween(king, checker)` helper** for block generation: with wrap-around rays
  "between" is not well defined. (Stream 1 reached this independently for movegen.)
- Expect **higher capture branching at the seam**, so qsearch explosion is a live risk.
  Make the node ratio a tracked metric, not a hope.

Classic bugs: standing pat while in check (must generate all evasions); no ply cap;
delta pruning left on in late endgames.

## Transposition table

Zobrist: `12 × 64` piece-square randoms, one side-to-move, castling rights, and **en
passant keyed by file, hashed only when an ep capture is actually available** — else
identical positions hash differently and transpositions are lost. JS `number` cannot
hold 64 bits: use `bigint` or two 32-bit halves.

> ### The variant trap: rule flags change legality but not the position key
>
> Two different rulesets produce **the same Zobrist key for the same piece placement**,
> while having different legal moves. Sharing one TT across configurations is a silent
> correctness bug. **Either salt the key with the flag set, or key the TT instance per
> ruleset.** This one is ours alone and easy to miss.

Bound assignment on store: `best >= beta ? LOWER : best > originalAlpha ? EXACT : UPPER`.
Probe cutoff requires `entry.depth >= depth` **and** a bound usable against the window.

**Mate-score adjustment is the classic trap** — store distance from the *current node*,
retrieve distance from the *root*:

```ts
const toTT   = (v, ply) => v >=  MATE_IN_MAX ? v + ply : v <= -MATE_IN_MAX ? v - ply : v
const fromTT = (v, ply) => v >=  MATE_IN_MAX ? v - ply : v <= -MATE_IN_MAX ? v + ply : v
```

Also: **never trust a TT move blindly** — verify legality before playing it, since
collisions (and, for us, cross-config keys) yield plausible-looking garbage. And note
**graph-history interaction**: a TT score is path-independent but repetition and the
50-move rule are path-*dependent*. Stockfish suppresses TT cutoffs at high 50-move
counts (`pos.rule50_count() < 96`).

## Mate and draw scoring

Mate is `-MATE + ply` from the mated side's view at the node where it is detected, so
deeper mates score lower and the engine prefers faster ones. Any `|v| >= MATE_IN_MAX` is
a mate score and must never be treated as a normal eval.

Draws inside search: return `0` on the **first repetition strictly after the root**
(Stockfish: `st->repetition && st->repetition < ply`). Waiting for a true threefold
inside the tree makes the engine blind to perpetuals.

The **"throws away a win by repeating"** bug comes from returning 0 without
distinguishing root history from search history, or from a TT `EXACT 0` written at a
repetition node and grafted onto a different path. Mitigation: use the root-aware test,
and **do not store repetition nodes in the TT in v1**. Ethereal jitters the draw score
(`1 - (nodes & 2)`) so the engine does not treat all draws as identical.

## Time management

Two budgets: a **soft limit** (do not *start* another iteration past it) and a **hard
limit** (abort mid-iteration). Poll the clock every ~2048 nodes, not every node.

**The safety rule: an aborted iteration publishes nothing.** Keep the best move and PV
from the last *completed* iteration. Never return a move from a partially searched root
— root ordering biases the partial best toward move 1. Corollary: depth 1 must always
complete before any time check can fire, so there is always *a* legal move.

## How to verify a search is correct, not merely strong

> **Correction to `engine-core.md`.** The criterion "a transposition table changes speed
> but not the chosen move at fixed depth" is **not sound**. TT grafting legitimately
> imports deeper results, and among equal-scoring moves the choice is arbitrary. Replace
> it with (3) below. Stream 4 independently found a second flaw in the same criterion —
> see [`ordering-and-pruning.md`](./ordering-and-pruning.md) on tie-breaking.

1. **Alpha-beta ≡ minimax.** ~500 positions (including seam-heavy ones), depth ≤ 4, full
   window, no TT, no qsearch — scores exactly equal. *Only* holds at the full window; at
   a narrow window alpha-beta returns a bound.
2. **PVS ≡ alpha-beta**, same corpus and depth.
3. **TT-for-ordering-only ≡ TT-off.** Probe for the move, disable score cutoffs; root
   score must match exactly. This isolates ordering bugs from scoring bugs. Then enable
   cutoffs and require agreement on the mate suite only.
4. **Mate suites.** Mate-in-N found at depth `2N−1` with score *exactly* `MATE−(2N−1)`.
   Run each position colour-flipped **and seam-reflected**. This is the strongest test
   of ply-adjustment through the TT.
5. **Node-count signature ("bench").** Fixed EPD suite at fixed depth → committed total
   node count and qsearch ratio. Stockfish requires the bench in every PR. This is the
   search-explosion regression guard, and it matters more than usual given seam capture
   density.
6. **Determinism.** Same inputs → identical node count and PV. No `Math.random`, no
   `Date.now` inside the pure search; the clock enters via an injected port.
7. **PV legality.** Every PV move legal when replayed from the root; length ≤ depth; a
   mate PV ends in checkmate.
8. **Colour symmetry.** `score(pos) === -score(colourSwap(pos))`.
9. **Zobrist.** Incremental key after apply/undo equals a from-scratch recompute —
   assert in dev builds across perft.

Perft remains the movegen oracle underneath all of it: a search cannot be correct on a
broken generator.

## Explicitly not in v1

Null-move pruning (zugzwang-unsound, and the seam changes zugzwang frequency in ways
nobody has studied), LMR, futility/razoring, aspiration windows, multi-threading
(nondeterministic — destroys criteria 5 and 6), checks in quiescence, tablebases,
opening books, pondering, NNUE, bitboards/magics.

**Do** include, as value-preserving pure-ordering changes: MVV-LVA, killer moves,
history heuristic, mate-distance pruning.

**Build order:** alpha-beta → qsearch → MVV-LVA → ID+PV → TT (ordering) → TT (cutoffs)
→ PVS → killers/history → time management.

## Prerequisite

Repetition and 50-move draw scoring depend on rules we have not implemented. **Finish
castling, promotion, en passant, repetition and 50-move first, or every draw-scoring
invariant above is untestable.** This corroborates the ordering already in
`roadmap.md`.

## Sources

- Stockfish `search.cpp` — `value_to_tt`/`value_from_tt`, TT cutoff + rule50 guard, TT-move legality: https://github.com/official-stockfish/Stockfish/blob/master/src/search.cpp
- Stockfish `position.cpp` — `is_draw`/`is_repetition`: https://github.com/official-stockfish/Stockfish/blob/master/src/position.cpp
- Ethereal `search.c` — ID abort, mate-distance pruning, jittered draw score, qsearch: https://github.com/AndyGrant/Ethereal/blob/master/src/search.c
- Stockfish CONTRIBUTING.md (bench in every PR): https://github.com/official-stockfish/Stockfish/blob/master/CONTRIBUTING.md
- Schaeffer, *Alpha-Beta Search Revisited*: https://static.aminer.org/pdf/PDF/000/372/211/alpha_beta_search_revisited.pdf
- Mediocre Chess, transposition tables: http://mediocrechess.blogspot.com/2007/01/guide-transposition-tables.html
- CPW (503, unread): Quiescence_Search, Delta_Pruning, Transposition_Table, Score, Iterative_Deepening, Test-Positions, Bratko-Kopec_Test
