# Story — Evaluation for a game nobody has played

> **Status: NEXT — promoted to the critical path (2026-09-22).** Part of the
> [engine epic](./README.md). **This is the hard part of the epic** — not the search — and
> it is now measured to be the blocker for the variant study *and* for the shipped
> opponent.

## 0. The measurement that promoted this story

Taken 2026-09-22 → [`../balance/readiness-probe.md`](../balance/readiness-probe.md) §1.

| Probe | Result |
| --- | --- |
| Distinct static scores among the 20 opening moves | **1** (every move scores `0`) |
| The same, with `{ mobility: true }` | **11**, range −3..51 |
| Self-play games ending `draw-repetition` | **18 of 18** |

`evaluate` is material-only by default, because mobility measured 1465× the material term
and was switched off. That removed **the only term that distinguishes quiet positions**, so
the engine is not weak but *indifferent*: ties break by generation order and play shuffles
until a threefold repetition. A real game log, all flags on, depth 3:

```
b1c3 a7a6 a1b1 a6a5 b1a1 a5a4 a1b1 b7b6 b1a1 c7c6 a1b1 …
```

Two consequences, and they are why this story now comes first:

1. **The variant study cannot start.** Every cell would report a 100% draw rate, the
   control would fail, and a faster engine would only produce more of the same data.
2. **The shipped opponent is affected.** In a quiet position it has no preference; against
   a human it plays aimlessly until something is capturable. "Wins a rook with a two-move
   back-rank tactic" and this are one fact seen from two sides.

**The bootstrap trap.** Texel tuning (§2 Stage B) labels positions by game result, and a
corpus of 100% draws carries no signal. Tuning therefore cannot be the first step:

```
cheap discriminating term  ->  decisive games  ->  corpus  ->  tuned weights
```

So Stage A is not "the humble baseline we start from" but **the thing that must work
first**, and its acceptance test is no longer "it compiles and is geometry-free" — it is
**games stop being degenerate**.

## Summary

As the owner, I want the engine's idea of a good position to be derived from this
variant rather than inherited from chess, so that it plays Mirror Chess rather than
playing chess badly on a strange board.

## 1. Why the inherited priors fail

Chess evaluation is a century of accumulated empirical knowledge — piece values,
piece-square tables, bishop pair, king safety, pawn structure. Measurements on the
current engine ([opponent README §1.2](../opponent/README.md)) show the seam invalidates the geometric
ones outright:

| Chess assumption | Status in Mirror Chess |
| --- | --- |
| Edge squares are bad for pieces | **False.** A knight attacks 8 squares from `a4`, same as `d4`. A bishop attacks 15 vs 17. |
| Bishops are colour-bound | **False.** Every seam hop flips square colour; one bishop reaches all 64 squares. |
| The bishop pair is worth ~half a pawn | **Probably worthless** — a single bishop already covers both colours. |
| Opposite-coloured bishops are drawish | **False** — there is no such thing as an opposite-coloured bishop. |
| A rank can be shielded by one blocker | **False.** Ranks are cycles; a rook attacks along them in both directions. |
| The corner is the safest square for a king | **Suspect, possibly inverted.** Corners cannot be walled off on their rank. |
| `P=1, N=3, B=3, R=5, Q=9` | Unknown. Bishops and knights both gain; by how much, relative to rooks, is exactly what we do not know. |

**Piece-square tables and the bishop pair are the two terms to be most suspicious of.**
Carrying them over would actively mislead the engine.

## 2. Approach: measure, then encode

Do **not** hand-author values and tune by feel. In order:

### Stage A — minimal, geometry-free evaluation
Material plus mobility plus a simple king-safety term counting attackers near the king.
No piece-square tables at all. Mobility is doing the work that PSTs do in chess:
rewarding a piece for having options, which automatically credits portal moves without
our asserting what they are worth. This is the baseline everything else must beat.

**Revised 2026-09-22 — Stage A must ship, and it must be affordable.** Mobility is
currently off for a measured reason (1465× the material term), so re-enabling it naively
trades one failure for another. Three ways out, cheapest first; pick by measurement, not by
argument:

1. **Bucketed / saturating mobility per piece type**, computed once per evaluation from the
   move generator — the shape engines actually use, since linear mobility overvalues an
   early queen.
2. **An evaluation hash** (Zobrist-keyed memo) before any incremental state. It is a pure
   memo, so it preserves testability
   ([`research/evaluation.md`](./research/evaluation.md)).
3. **Incremental attack tables** only if 1–2 are not enough. Flagged as the most bug-prone
   option here: seam-wrapping slider attacks make a wrong table a *silent correctness* bug,
   not a slow one.

**Do not reach for a tie-break hack.** A small random or contempt term would stop the
shuffling and hide the absence of signal, leaving the study measuring noise. The engine
must *prefer* the better quiet position, not merely avoid repeating.

**Structure it as `features ∘ dot` from day one** — `features(pos): FeatureVector` and
`scoreOf(f, w): Score`. That single decision is what makes Stage B gradient tuning possible
without a rewrite, and it is what lets the Python layer fit weights while never seeing a
board ([`../balance/analysis-project.md`](../balance/analysis-project.md) §1).

### Stage B — derive piece values from play
Two independent methods; agreement between them is the evidence:

1. **Texel-style tuning.** Fit evaluation weights by minimising prediction error of
   game outcomes over a corpus of self-play games. Standard, cheap, well understood.
2. **Material-imbalance sampling.** Play many games from positions that start a piece
   up or a piece down (e.g. bishop for knight) and measure the score difference. Slower
   but assumption-free, and it directly answers "what is a bishop worth now".

### Stage C — test the structural hypotheses
Each is a question the engine can answer better than we can argue:

- [ ] **Are piece-square tables worth anything?** Compare Stage A against Stage A plus
      chess PSTs, head to head. Expect chess PSTs to *lose*.
- [ ] **Is the bishop pair worth anything?** Compare with the bonus on and off.
- [ ] **Is castling into the corner bad?** Measure the score of positions by king file,
      and play a match between an engine that likes castling and one that does not.
- [ ] **How much is king safety worth, and what shape does it take** when ranks are
      cycles and shelter needs two blockers?
- [ ] **What is a portal move worth on average**, if anything, as a mobility weight?

### Stage D — encode only what survived
Add terms that measurably beat Stage A. Record every term's evidence next to it.
A term nobody can justify is a term that will mislead the next person.

## 3. Acceptance Criteria

- [ ] **Quiet positions are distinguishable**: the moves from the opening position take
      more than one distinct static score. This is the criterion whose absence blocked the
      study, so it is stated first and tested directly.
- [ ] **Self-play stops being degenerate**: over a sample of seeded games under all-off,
      sliders-only and all-on, the repetition-draw rate is well below 100% and decisive
      games occur. Recorded as a number, not an impression.
- [ ] Evaluation is structured as `features ∘ dot`, with feature extraction the only place
      rules meet evaluation.
- [ ] The cost of the discriminating term is **measured and reported** next to it — the
      1465× figure is what made the original term unusable, and its replacement earns its
      place by the same standard.
- [ ] A `Evaluation` module, pure, scoring a position in centipawns from the side to
      move's perspective.
- [ ] **Colour symmetry**: evaluating a position and its colour-swapped equivalent
      gives exactly negated scores. Asserted as a property test over random positions.
- [ ] **Left–right symmetry**: evaluating a position and its file-mirrored equivalent
      gives the *same* score. This one is specific to this variant and follows from
      spec §7 — a natural test that chess engines cannot even express.
- [ ] Stage A is implemented and is the documented baseline.
- [ ] Piece values are derived by at least one of the Stage B methods, with the numbers
      and method recorded.
- [ ] Each Stage C hypothesis is tested and the result written down, including the ones
      that come back "no measurable difference".
- [ ] Every evaluation term has a comment saying what evidence justifies it.
- [ ] The tuned engine beats the Stage A baseline in a match by a clear margin.

## 4. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/engine/eval.test.ts` | colour symmetry, file-mirror symmetry, monotonic in material |
| Unit | `src/engine/eval.hypotheses.test.ts` | pins the measured values so a regression is visible |
| Match | `scripts/eval-match.ts` | candidate vs baseline, with confidence intervals |

## 5. Relationship to the variant study

This story and [`../balance/variant-study.md`](../balance/variant-study.md) have a
circularity worth naming: the study wants an unbiased engine, and an unbiased engine
wants values derived per variant — but values are derived by playing, which needs an
engine.

The way out is to accept one round of iteration rather than pretend it does not exist:

1. Stage A (geometry-free) is unbiased *enough* to screen variants, because it asserts
   almost nothing.
2. The study screens with it, and shortlists.
3. Values are then derived properly for the shortlisted rulesets.
4. The shortlist is re-run with the better evaluation, and any conclusion that flips is
   reported as such.

**Do not present Stage A results as final.** Their whole value is being cheap and
nearly assumption-free, not being right.

## 6. How far the learning goes, and who does it

**Decided 2026-09-22: Texel tuning only, for now.** Linear weights, fitted by logistic
regression against game outcomes, per ruleset. The fitting lives in Python
([`../balance/analysis-project.md`](../balance/analysis-project.md)); the features and the
dot product stay in TypeScript, so the learner never sees a board.

The deliverable is not only a stronger engine. **Per-ruleset piece values are a headline
result of the study**: `PIECE_VALUES` currently carries the comment *"inherited from chess,
and explicitly flagged for tuning… expect the bishop's to move most"*, and this is what
turns that labelled guess into a measurement. What is a bishop worth when it reaches every
square and can mate alone?

**The calibration comes first.** Tune the all-off control and check the pipeline recovers
roughly `P≈1, N≈3, B≈3, R≈5, Q≈9`. All flags off *is* chess, so that answer is known from
outside the project. If the control's values are wrong, no variant's values are reportable.

## 7. Deferred, with the trigger that would revive it

| Technique | Why not now | Trigger |
| --- | --- | --- |
| **Learned piece-square tables**, constrained by file-mirror symmetry | More parameters per ruleset, so more data per cell; not needed to un-block the study | Texel tuning lands and square-dependence is the biggest residual |
| **NNUE / small neural evaluation** | Needs ~10⁸ labelled positions and int8 inference TypeScript cannot deliver; opaque, so in tension with CLAUDE.md §12 | Rules frozen, tuned linear baseline shipped, and a native engine chosen — it forces that decision rather than following it |
| **AlphaZero-style per-variant RL** | The methodologically ideal answer to the strength confound, at GPU-weeks of cost | The screen shows the strength confound dominating the effects we care about |
| **Per-variant endgame tablebases (3–4 piece)** | Not needed to start, but cheap and unusually valuable here | Promote when the screen runs: gives the only *exactly computable* distance-to-optimal metric, and exact scoring of endings removes move-limit noise from the draw rate. Note the symmetry available is 2× in general, 8× for stepper-only material ([`../balance/readiness-probe.md`](../balance/readiness-probe.md) §4) |

## Definition of done

An evaluation whose every term is justified by a measurement on this variant, that is
provably symmetric in both colour and file, and that beats a geometry-free baseline.
