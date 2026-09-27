# Research

Where this project's investigation lives. Research is **input to decisions, never a
decision** — conclusions land in a spec section, an ADR, or a story.

## Why there is a research function at all

The project has outgrown the point where good judgement is enough. It now spans three
bodies of knowledge nobody here has by default:

1. **Chess engine construction** — a mature field with decades of accumulated practice,
   most of which assumes a fixed board geometry we have deliberately broken.
2. **Design of experiments over large discrete spaces** — because the ruleset is
   configurable, and the configuration space has outgrown brute force.
3. **Automated game design and game-quality measurement** — because the goal is not just
   a balanced variant but a *good* one, and "good" has an academic literature that is
   partly rigorous and partly overclaimed.

Guessing in any of these produces work that looks finished and is wrong. That is the
same failure the rules-first reboot was created to prevent, one level up.

## Streams

| Area | Index |
| --- | --- |
| Chess engine construction | [`../epics/engine/research/README.md`](../epics/engine/research/README.md) |
| Computational science of the variant study | *this folder — in progress* |

### Round 1 — engine construction (2026-08-02, complete)

Five streams on board representation, search, move ordering and pruning, evaluation, and
exemplars/TypeScript performance. Produced three corrections to work already written and
one validation. See that index.

### Round 2 — the variant study (2026-08-02, complete)

Prompted by the decision to split each piece's portal into **quiet move** and **capture**
(see [`../epics/rules/move-capture-split.md`](../epics/rules/move-capture-split.md)),
which expands the configuration space by ~32× and makes brute force infeasible.

| Stream | Question |
| --- | --- |
| Experimental design | **Complete** → [`experimental-design.md`](./experimental-design.md). A staged protocol at ~16× less compute than brute force. |
| Automated game design | **Complete** → [`game-quality-and-fun.md`](./game-quality-and-fun.md). Fun cannot be measured from self-play; non-games can be rejected, survivors ranked on named properties, and humans decide. |
| Empirical game theory | **Complete** → [`equilibrium-and-balance.md`](./equilibrium-and-balance.md). Found the closest prior art in existence: DeepMind assessed nine chess rule variants with AlphaZero ([arXiv:2009.04374](https://arxiv.org/abs/2009.04374)). |
| Self-play statistics | **Complete** → [`self-play-statistics.md`](./self-play-statistics.md). Found that standard paired-opening practice is *counterproductive* for our estimator, and that per-cell precision is unaffordable while factorial contrasts are ~free. |
| Variant precedent | **Complete** → [`variant-precedent.md`](./variant-precedent.md). Divergent pieces are a well-trodden design space, Fairy-Stockfish ships the quiet/capture split, and the king's flags must be constrained. |

### Round 3 — puzzles (2026-09-26)

[`puzzle-difficulty-and-novelty.md`](./puzzle-difficulty-and-novelty.md) — how to rank
mined puzzles once they are generated automatically. **The headline is a negative
result:** difficulty cannot be predicted without human solve data (the state of the art
manages MAE ≈ 259 Glicko points with 4.2M labelled puzzles), and the principled method —
Maia-style human-move prediction — needs millions of human games *in the variant being
modelled*, which for Mirror Chess do not exist.

Measured on our own set at the same time: the obvious engine-depth proxy is **dead** for a
fixed goal, two-thirds of the puzzles give Black only one defence, and the top four motifs
are 71% of the library.

### Follow-up measurement (2026-08-03)

[`opening-set-legality.md`](./opening-set-legality.md) — answering round 2's
highest-priority open question against our own engine rather than the literature.
**Result: one universal opening set does not work.** Divergence starts at ply 3 and
reaches ~7% of positions by ply 5.

## Corrections from round 2 — **applied** to the balance epic

All five streams landed; the epic was rewritten once, from the whole picture:

- **[`../epics/balance/README.md`](../epics/balance/README.md) §1's target is not
  measurable.** It asks for "a variant whose equilibrium value is a draw". Self-play
  cannot establish that: a rising draw rate is *consistent with* a drawn value but cannot
  distinguish it from "won, but beyond both engines' horizon". The target needs restating
  in terms of what the method supports.
- **Decisiveness at a fixed strength is largely a strength artifact**, so the metric set
  needs matched-strength comparison and a compute ladder, not single-point measurement.
- **The primary result should be flag main effects, not a leaderboard** — ranking
  thousands of noisy cells invites a winner's curse.
- **A chess-tuned engine is differentially weaker on variants far from chess**, which
  would record "our engine plays this badly" as "this variant is decisive". This is the
  main threat to validity and the epic does not currently mention it.
- **Use mirrored-position antithetic pairs, not colour-reversed pairs.** Copying standard
  Fishtest practice would have *reinforced* opening bias in our estimator rather than
  cancelling it — the sign flips because our two players are identical.
- **Design the study around factorial contrasts from the start.** Per-cell ±1pp costs
  ~19.7M games; main effects are 11–32× tighter for free. Cells are exploratory only.
- ~~**Highest-value cheap check:** verify the opening set is legal under every ruleset.~~
  **Measured 2026-08-03 — it is not.** See
  [`opening-set-legality.md`](./opening-set-legality.md). Divergence begins at ply 3;
  by ply 5 ~7% of positions are affected. The opening-set decision is now a real
  trade-off between variance and bias, recorded there.

## Standing rules for research

- **Cite primary sources.** Papers, engine source, canonical project docs. Secondary
  summaries are a starting point, not evidence.
- **Say what you could not verify.** Round 1 ran while chessprogramming.org returned 503
  throughout; every digest records which claims are first-hand. That honesty is worth
  more than the missing detail.
- **Research does not decide.** A digest that reads like a plan has overstepped. The
  synthesis is a separate, owned step.
- **Record what a finding *changed*.** A digest that produced no correction and no
  decision was probably not worth running.
