# Research — evaluation architecture

> Fan-out stream 2 of 5, 2026-08-02. See [`README.md`](./README.md) for the CPW-503
> caveat. Stockfish `evaluate.cpp`, the tapered-eval formula and the piece-value tables
> were read first-hand; CPW's *Mobility* and *Texel's Tuning Method* pages were not.

## How classical evaluation is structured

A handcrafted eval is a **weighted linear combination of features**, computed
White-relative and negated for the side to move. Stockfish 15's classical
`evaluate.cpp` decomposes into: material · imbalance · pawns · pieces · mobility · king
safety · threats · passed pawns · space · initiative · endgame scaling.

Every term returns a `(midgame, endgame)` pair, interpolated by **game phase** — this
exists to remove evaluation discontinuity, not to model chess:

```
phase = (phase * 256 + TotalPhase/2) / TotalPhase     // P=0 N=1 B=1 R=2 Q=4, total 24
eval  = (mg * (256 - phase) + eg * phase) / 256
```

## Published piece values — and why none of them are usable here

| Source | P | N | B | R | Q |
| --- | --- | --- | --- | --- | --- |
| Classical | 1 | 3 | 3 | 5 | 9 |
| Berliner 1999 | 1 | 3.2 | 3.33 | 5.1 | 8.8 |
| Kaufman 2021 (mg/eg) | 0.8/1.0 | 3.2 | 3.3 (+0.3 pair) | 4.7/5.3 | — |
| AlphaZero-derived | 1 | 3.05 | 3.33 | 5.63 | 9.5 |

Published queen estimates span **7.9–10.4** even for ordinary chess. All of these encode
chess mobility, which we have measurably changed. Modern engines do not author values —
they tune them.

## Texel tuning — an implementable spec

Supervised logistic regression of eval onto game outcomes:

```
sigma(s) = 1 / (1 + 10^(-K * s / 400))
E(w)     = mean_i ( R_i - sigma(eval_w(pos_i)) )^2        R in {0, 0.5, 1}
```

- **K is fitted first** by 1-D minimisation with weights frozen, then held fixed.
- **Data hygiene:** label with the *game's* result, not an engine score; drop the first
  ~5 plies; drop mate positions; keep only positions where `staticEval == quiescence`
  so tactics do not pollute the fit. Evaluate statically during tuning — do not run
  qsearch.
- **Sizes:** ~725k positions (Zurichess) to ~10M (Grant). chess4j attributes ~100–120
  Elo to tuning alone.
- **Optimiser:** naive coordinate descent works but takes "hours or days". If eval is
  expressed as an explicit dot product, analytic gradient descent runs in **minutes**.

> **The single most important architectural consequence:** design evaluation as
> `features ∘ dot` from day one.
>
> ```ts
> function features(pos: Position): FeatureVector   // the ONLY place rules meet eval
> function scoreOf(f: FeatureVector, w: Weights): Score   // dot product
> ```
>
> That one decision is what makes gradient tuning possible later instead of requiring a
> rewrite.

Alternatives: **SPSA** optimises playing strength directly but needs hand-chosen
meta-parameters; **CLOP** tunes its own. Both cost a game per sample — orders of
magnitude more expensive per bit than Texel. Practical split: Texel for eval weights,
SPSA/SPRT for search parameters.

## The v1 recommendation: material + mobility, no piece-square tables

**For.** PSTs encode *chess* square priors — centralisation, edge penalty — that our own
measurements falsify (a knight sees 8 squares from `a4` and from `d4`). A hand-authored
PST would be superstition. Mobility, by contrast, is measured from our own move
generator, so it credits seam moves automatically without anyone deciding what a seam
move is worth. **It is the one classical term whose semantics survive the variant
unchanged.**

**Failure modes to respect:**

- Raw legal-move counts are "of little value" — many moves are pointless.
- **Double counting with material.** If bishops gain ~8 squares *everywhere*, that
  constant is a piece-value term wearing a mobility costume; only the *variance* is real
  mobility. → **Tune material and mobility jointly, never sequentially.** They are
  collinear here in a way they are not in chess.
- **Safe mobility** (excluding squares attacked by enemy pawns) is better but expensive
  without incrementally updated attack tables.
- Linear mobility overvalues the early queen; engines use per-piece, **concave
  (saturating)** bonus tables indexed by count.

Start with `material × {mg,eg}` + `mobilityBonus[pieceType][count] × {mg,eg}` — about 40
weights — then **bootstrap data by self-play**, label with results, and Texel-tune.
There is no external corpus for this variant; accept one weak generation to get the
second.

If square-dependence is wanted later, **learn** a PST from the tuner rather than
authoring one, constrained by the file-mirror symmetry below (which halves the free
parameters and prevents overfitting).

## Testing and explainability

- **Colour symmetry (mandatory):** `evaluate(pos) === -evaluate(colourFlip(pos))`.
  Symmetry-test each term as it is added; symmetry bugs hide by cancelling.
- **File-mirror symmetry (ours alone):** our rules are invariant under file reversal, so
  `evaluate(pos) === evaluate(fileMirror(pos))` **must hold**. No chess engine can run
  this test — castling rights and asymmetric PSTs break it there. Gate it off when
  castling rights are asymmetric and in all-flags-off mode.
- **Eval trace:** replicate Stockfish's `Trace` as `explain(pos)` returning a typed
  per-term breakdown. Primary debugging *and* explainability surface — and it feeds the
  "why did you play that?" UI panel.
- **Sanity suite:** `evaluate(startpos) === 0` modulo tempo; monotonic in material; a
  "no single term exceeds N cp" tripwire.
- **Strength regression:** self-play with SPRT — the only test that says whether a
  change is *good* rather than *consistent*.

## NNUE — not now

A small quantised net with incrementally updated first-layer accumulator. It needs
**hundreds of millions to billions of labelled positions**, typically generated by an
already-strong engine — a bootstrap we do not have — plus a training pipeline and int8
SIMD inference, which TypeScript cannot deliver. Revisit only after: rules frozen,
working search, self-play infrastructure, and a tuned handcrafted baseline to generate
labels.

## Incremental vs from-scratch

Engines incrementally update only cheap decomposable state: Zobrist key, material count,
PST sum, pawn-hash key, NNUE accumulator. Occupancy-dependent terms (mobility, king
safety, threats) are recomputed each call.

**For v1: compute from scratch, keep `evaluate` pure.** There is no PST to maintain and
material is trivial. Variant-specific reason to be conservative: seam-wrapping slider
attacks make any incremental attack-table scheme markedly more bug-prone, and a wrong
attack table is a **silent correctness bug, not a slow one**. If profiling hurts, add an
**eval hash** (Zobrist-keyed memo) before adding incremental state — it is a pure-function
memo and preserves testability.

## Explicitly not in v1

1. **No hand-authored PSTs** — falsified by our own square-count data.
2. **No bishop-pair bonus** — bishops are not colour-bound, so the pair's entire
   justification evaporates.
3. **No opposite-coloured-bishop drawishness** — the concept does not exist here.
4. **No chess king-safety heuristics** — pawn shelter, castle-to-the-corner, back-rank
   safety. Each rank is a cycle and the seam funnels sliders into corners. **Leave king
   safety out entirely until there is data, rather than inverting it by guesswork — an
   inverted guess is still a guess.**
5. No imported piece values, chess tuning corpora, or opening books.
6. No NNUE, no incremental eval state, no lazy eval with chess-tuned margins.
7. **Do not tune material and mobility separately.**

## The useful asymmetry: pawn logic survives

In the v1 `BRQ---` configuration **pawns do not cross the seam**, so doubled / isolated /
passed-pawn definitions and pawn capture geometry are unchanged. The terms that break
are precisely the slider- and king-geometry ones.

That gives a clean ordering principle: **add pawn terms early with moderate confidence,
add king terms last with none.**

## Sources

- Stockfish `evaluate.cpp` (sf_15), read directly: https://github.com/official-stockfish/Stockfish/blob/sf_15/src/evaluate.cpp
- Tapered eval phase formula: http://mediocrechess.blogspot.com/2011/10/guide-tapered-eval.html
- Piece values (Kaufman / Berliner / AlphaZero): https://en.wikipedia.org/wiki/Chess_piece_relative_value
- Texel tuning, sigmoid + dataset hygiene: https://github.com/maksimKorzh/wukongJS/blob/main/docs/TEXEL'S_TUNING.MD
- Tuning in chess4j (K, dataset sizes, Elo): https://jamesswafford.dev/automated-parameter-tuning-in-chess4j/
- NNUE overview: https://en.wikipedia.org/wiki/Efficiently_updatable_neural_network
- CPW (503, unread): Evaluation, Tapered_Eval, Texel's_Tuning_Method, Mobility, Color_Flipping
