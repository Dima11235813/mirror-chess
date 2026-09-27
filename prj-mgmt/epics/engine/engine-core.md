# Story — Engine core (search)

> Part of the [engine epic](./README.md). Stage 1: the smallest engine that plays a
> legal, sensible game. Shares its search with
> [`../balance/search-engine.md`](../balance/search-engine.md); that story adds the
> throughput work this one does not need.

## Summary

As a player, I want an engine that picks a reasonable move in about a second under the
current rules, so that I can play Mirror Chess against something.

## 1. Scope

**In:** negamax with alpha-beta, iterative deepening, quiescence, move ordering, a
transposition table, and a deliberately minimal evaluation (material + mobility).

**Out:** tuned evaluation ([`evaluation.md`](./evaluation.md)), the worker and UI
([`opponent-integration.md`](../opponent/opponent-integration.md)), and the performance rewrite
(not needed — [README §1.1](./README.md)).

### Ruleset for v1: `BRQ---` — sliders only

**Decided 2026-08-01.** The engine is developed and judged against **bishop, rook and
queen crossing the seam; knight, king and pawn ordinary chess** — the rules exactly as
spec §4 first defined them, before §11.

Not a simplification for its own sake. The reasoning:

- **It targets the hard part.** The slider *transit* is what stresses an engine: the
  precomputed ray paths of [ADR 0003](./adr/0003-rule-configuration-in-the-hot-path.md),
  quiescence over portal captures, and static exchange evaluation with attackers
  arriving through the seam. Those are where a chess-shaped implementation is silently
  wrong. The stepper *wrap* (§11) is by comparison just a different destination square —
  cheap to add later, and it validates far less per unit of difficulty.
- **It keeps the engine judgeable.** With kings crossing, kings are nearly impossible to
  corner, mating nets are rare, and "is this engine any good?" becomes very hard to
  answer. Standard kings and pawns keep mate patterns and endgames chess-like, so
  search-quality bugs stay distinguishable from rule novelty. Debugging one unknown at a
  time.
- **It costs no rework.** Flags are read from `GameState`, so switching `NKP` on later is
  configuration, not a migration — provided the engine never assumes a flag's value
  anywhere. Which is exactly what the tests below enforce.

**The engine must still be ruleset-agnostic.** `BRQ---` is what we *develop and tune*
against, not what we hardcode. Two guardrails:

- Correctness tests run against **`BRQ---`, `BRQNKP` and `------`** from day one. The
  engine may play *worse* under a ruleset it was not tuned for; it may never play
  *illegally* or crash.
- `------` is ordinary chess, so it stays in CI as the **published-perft oracle**
  regardless of what we develop against. That check is free once flags exist and is the
  strongest correctness signal available anywhere in the project.

## 2. Design

```ts
export interface SearchLimits { readonly depth?: number; readonly ms?: number; readonly nodes?: number }
export interface SearchResult {
  readonly move: Move | null      // null only when there is no legal move
  readonly score: number          // centipawns, from the side to move's point of view
  readonly depth: number
  readonly nodes: number
  readonly pv: readonly Move[]
}
export function search(state: GameState, limits: SearchLimits, seed?: number): SearchResult
```

- **Pure and deterministic** for a given `(state, limits, seed)`. The core stays free
  of I/O and clocks; a time limit is injected as a `now()` function so tests can drive
  it deterministically.
- Reads the ruleset from `GameState` from the outset, so rule flags need no retrofit.

### Things the mirror rules change about a standard search

These are the places a textbook implementation will be quietly wrong:

- **Quiescence must include portal captures.** A search that only extends on "normal"
  captures will walk into a bishop taking a queen through the seam. This is the most
  likely source of horizon-effect blunders.
- **Static exchange evaluation** must count attackers arriving through the seam, on
  both sides of the exchange. An SEE that assumes chess geometry will misjudge every
  exchange near the edge files.
- **Move ordering heuristics carry chess assumptions.** MVV-LVA is fine (it is about
  piece values, not geometry). Anything that scores "advance toward the centre" is not.
- **Repetition detection is essential**, not an optimisation — see §3.
- **Legality can be relaxed inside the search.** Generating pseudo-legal moves and
  discarding those that leave the king capturable is much cheaper than the current
  per-move full legality filter, and is the one easy speed win worth taking now.

### The transposition-table trap that is ours alone

Two different rulesets produce the **same Zobrist key for the same piece placement**
while having **different legal moves**. Sharing one table across rulesets is a silent
correctness bug — the kind that produces plausible garbage rather than a crash.

**Either salt the key with the rule flags, or key the table instance per ruleset.**
Decide before the first TT probe is written, and cover it with a test that searches the
same position under `BRQ---` and `------` in one process and asserts the results differ.

## 3. Termination

The engine must not be the thing that discovers we have no draw rules. Until
[`../rules/draw-rules.md`](../rules/draw-rules.md) lands, the search treats a repeated
position as a draw internally (score 0) so it does not chase phantom progress, and the
caller enforces a hard move cap. Once the real rules exist, this internal rule is
deleted in favour of them.

## 3a. Build order, and the v1 technique whitelist

Synthesised from the [research fan-out](./research/README.md). Each step is
**value-preserving**, which is what makes the equivalence criteria in §4 testable at
every stage rather than only at the end.

```
1. Fail-soft alpha-beta + iterative deepening                    SAFE
2. Ordering v1: previous-iteration PV move → MVV-LVA captures
   → promotions → quiets                                         SAFE
3. Killers (2 per ply) + butterfly history [side][from][to]      SAFE
4. Transposition table (Zobrist), best-move-only — ordering,
   no value cutoffs                                              SAFE
5. Seam-aware SEE, used ONLY to sort captures                    SAFE
6. Quiescence (captures + promotions)          — violates equivalence by design
7. TT value cutoffs                            — conditional; mate suite only
8. PVS                                                           SAFE
9. Time management (soft/hard limits)
```

Steps 1–5 and 8 must **all** pass the alpha-beta ≡ negamax criterion unchanged. That is
the entire reason for restricting v1 to safe techniques: any divergence is a bug, not a
tuning artefact.

### Explicitly deferred, behind flags defaulting to off

Null-move pruning, late move reductions, futility and reverse futility, razoring,
movecount pruning, ProbCut, aspiration windows, checks in quiescence, multi-threading,
tablebases, opening books, NNUE, bitboards and magics.

Each is **forward pruning**: it prunes before anything about a branch has been
evaluated, so it can change the root score. LMR is worth singling out — it is unsafe
*even with* a fail-high re-search, because a wrong **fail-low** is never re-searched.
Multi-threading is disqualified for a different reason: it destroys the determinism and
node-count criteria in §4.

### SEE: for ordering, never for pruning

The two research streams appeared to disagree — one advised no SEE in v1, the other SEE
for ordering. They reconcile cleanly:

**MVV-LVA needs only an ordinal ranking**, and it is pure ordering, so wrong piece values
cost nodes and never correctness. Ship it on placeholders (`P < N ≈ B < R < Q`), knowing
that in this variant a bishop may genuinely outrank a rook.

**SEE feeds pruning decisions**, so mis-valued bishops would prune genuinely good
captures. Until piece values are *measured*
([`evaluation.md`](./evaluation.md)), **SEE sorts captures and decides nothing.**

### Four ways a seam breaks a textbook SEE

Implementing SEE from a chess reference will be silently wrong. The failure modes, in
descending order of nastiness:

1. **The same rook reaches the target from both directions** along a cyclic rank. If
   `attackersTo` returns a list rather than a **set of squares**, SEE lets one rook
   capture twice and reports a fictitious material win.
2. **The x-ray trick "extend the ray past the removed square" does not work** — across a
   seam the line *bends*. Recompute `slidingAttacksFrom(to, occupied)` from scratch after
   each removal. This is also the more readable choice.
3. **`attackersTo` must use the same ray walker as move generation.** The classic variant
   bug is movegen crossing the seam while attack detection does not; SEE then misses a
   defender and calls a defended piece hanging.
4. **Self-batteries through the seam are routine**, not exotic — two rooks on a rank
   defend each other from opposite directions. Pins bend too, so blocker detection must
   go through the same walker.

### One more thing that cannot be borrowed

**Never compute "the squares between the king and the checker" by interpolating
coordinates.** Under the seam, *between* is not a linear relation — blocking squares must
come from the compiled ray path. Both the movegen and search research streams reached
this independently.

## 4. Acceptance Criteria

> **Progress (2026-08-05).** Whitelist steps **1, 2, 6 and 9** are built — fail-soft
> alpha-beta with iterative deepening, MVV-LVA ordering with the previous-iteration PV
> move, quiescence, and time management via an injected stop signal. Steps 3 (killers /
> history), 4 (TT), 5 (SEE) and 8 (PVS) remain.

- [x] Returns a legal move for any position with at least one, and `null` otherwise.
- [x] Deterministic for a fixed `(state, limits)` — identical move, score and node count.
- [x] Finds forced mate in 1 and 2 — including **a mate delivered through the seam**
      (king and bishop alone, which is impossible in chess).
- [x] Prefers a faster mate, and prefers mate to winning material.
- [ ] Scores are symmetric: evaluating a position and its colour-swapped mirror gives
      negated scores. *(Not yet tested; the evaluation is material-only, so it holds
      trivially today and will need the test once terms are added.)*
- [x] **Alpha-beta ≡ plain negamax** at equal depth, at the full window, with no TT and no
      quiescence, over a corpus including seam-heavy positions. Scores exactly equal.
      Quiescence is a **flag** precisely so this comparison stays possible.
- [x] The **same best move**, via a strict `>` update in both searchers plus a stable
      ordering sort with an explicit index tie-break. Checked with ordering on *and* off,
      since ordering is the thing that could legitimately change which of several
      equal-scoring moves wins.
- [ ] **PVS ≡ alpha-beta** on the same corpus and depth. *(PVS not built.)*
- [ ] **TT-for-ordering-only ≡ TT-off**: probe for the move, disable score cutoffs, and
      the root score must match exactly. This isolates TT *ordering* bugs from TT
      *scoring* bugs. With cutoffs enabled, require agreement on the mate suite only —
      **not** on the chosen move, since TT grafting legitimately imports deeper results.
- [ ] A **node-count signature** ("bench"): a fixed position suite at fixed depth with a
      committed total node count and quiescence-node ratio, checked on every change.
      Stockfish requires this in every PR. It is the search-explosion regression guard,
      and it matters more than usual here because the seam raises capture density.
- [ ] **Determinism**: identical inputs give identical node counts and PV. No
      `Math.random` or `Date.now` inside the search; the clock enters via an injected
      port.
- [ ] **PV legality**: every principal-variation move is legal when replayed from the
      root, PV length ≤ depth, and a mate PV ends in checkmate.
- [ ] Respects `ms` limits within a sensible tolerance, via iterative deepening that
      can abandon an incomplete iteration safely.
- [ ] Handles positions with no legal move, with only a king, and with the side to move
      already mated, without throwing.
- [ ] Uses the seam: on a suite of positions where a portal move is clearly best, it
      finds it.
- [ ] **Mate suites** find mate-in-N at depth `2N−1` scoring *exactly* `MATE−(2N−1)`,
      run colour-flipped **and seam-reflected**. This is the strongest available test of
      mate-score ply adjustment through the transposition table.
- [ ] **Zobrist integrity**: the incrementally maintained key after apply/undo equals a
      from-scratch recompute, asserted across perft in dev builds.

### Ruleset-agnosticism (guards the `BRQ---` scope decision)
- [ ] Every correctness criterion above passes under **`BRQ---`, `BRQNKP` and `------`**.
      Strength may differ; legality and stability may not.
- [ ] Under `------`, perft matches **published chess numbers** (20 / 400 / 8,902 /
      197,281 from the opening position). This is the external oracle and runs in CI.
- [ ] No flag value is hardcoded anywhere in `src/engine/*` — the ruleset arrives via
      `GameState` and is compiled into tables once
      ([ADR 0003](./adr/0003-rule-configuration-in-the-hot-path.md)).
- [ ] Switching `NKP` on is a configuration change, demonstrated by running the full
      suite under `BRQNKP` with no code edit.

## 5. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/engine/search.test.ts` | mates, symmetry, determinism, terminal positions |
| Unit | `src/engine/pruning.test.ts` | alpha-beta ≡ negamax; TT does not change the move |
| Unit | `src/engine/quiescence.test.ts` | portal captures are resolved, not left hanging |
| Unit | `src/engine/see.test.ts` | exchanges involving attackers through the seam |
| Bench | `src/engine/bench.ts` | nodes/second and depth reached in 1s, tracked over time |

The **portal-capture quiescence tests deserve the most care**. Construct positions
where a piece is defended only through the seam, and where it is attacked only through
the seam; a chess-shaped implementation gets both wrong and the failure is silent.

## Definition of done

An engine that plays a legal, non-embarrassing game at depth ~6 in about a second,
whose pruning is proven equivalent to plain search, and which does not blunder to
tactics that arrive through the seam.

### Where that stands (2026-08-05)

**Met:** legal and non-embarrassing, pruning proven equivalent, and it finds seam tactics
rather than blundering to them — including a king-and-bishop mate that does not exist in
chess.

**Not met: depth ~6 in about a second.** Measured on a dense middlegame, all portal flags
on: depth 3 in 0.3 s, depth 4 in 1 s, depth 5 in 8 s. Depth 6 is minutes. From the opening
it is far better — depth 5 in ~1 s — but the middlegame number is the honest one.

The bottleneck is **not** the search, and this matters for what to do next. A node costs
~300 µs because `allLegalMoves` copies the board and re-scans for attacks once per
pseudo-legal move; the engine runs at tens of thousands of nodes per second where a chess
engine runs at millions. Adding a transposition table or PVS would shave the *node count*,
which is worth doing, but the order-of-magnitude gap is board representation — roadmap
item 7, `search-engine.md`: make/unmake instead of copying, attack-from-square tables,
typed arrays, with the current generator kept as the differential-perft oracle.

### Two measurements from building it

Both were surprises, both are recorded in the code, and both changed a decision:

1. **Quiescence is 80–94% of all nodes**, and the seam roughly **triples** the tree
   (Kiwipete depth 3: 18,444 nodes under `------`, 34,303 under `BRQ---`, 62,850 with
   every flag on). The research predicted a qsearch explosion risk; it is real.
2. **A mobility term costs 1465× a material term** (567 µs vs 0.4 µs per evaluation).
   Since ~95% of nodes are leaves, that *was* the entire budget — the engine ran at ~1,000
   nodes/second. Evaluation is now material-only by default, and generating forcing moves
   directly in quiescence instead of filtering the full legal list made the engine
   **11–14× faster** with node counts essentially unchanged.
