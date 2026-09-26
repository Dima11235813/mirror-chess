# Research — measuring equilibrium and balance from self-play

> Round 2, stream 3 of 5, 2026-08-02. See [`README.md`](./README.md).
> Sources are primary papers throughout; two items are flagged as unverified or as the
> researcher's own extrapolation rather than literature.

## The headline: DeepMind has already run this experiment

**Tomašev, Paquet, Hassabis & Kramnik (2020), *Assessing Game Balance with AlphaZero:
Exploring Alternative Rule Sets in Chess*** — [arXiv:2009.04374](https://arxiv.org/abs/2009.04374).

They trained AlphaZero on nine chess rule variants (no-castling, torpedo, pawn-back,
pawn-sideways, self-capture, stalemate-as-win, and others) and assessed each for balance
and richness. That is our study, with a different flag set and vastly more compute.

**Read this paper before finalising the study design.** It is the closest prior art in
existence, it establishes the methodology, and it supplies the numbers below.

## The single most important finding: measured imbalance is mostly a strength artifact

From that paper, White's score by compute:

| Variant | 800 sims | 1 s/move | 1 min/move |
| --- | --- | --- | --- |
| Classical chess | 54.1% | 51.8% | **50.8%** |
| No-castling | 55.7% | 53.3% | **51.3%** |

**Measured imbalance roughly halved with two steps of compute.** A study run at weak
strength does not measure the game; it measures the engine's horizon.

The same holds for draws. On 2.12M CCRL games, draw rate runs ~22% at Elo 2000, ~45% at
3000, ~73% at 3500, ~88.5% at 3650 *(source is an unrefereed blog — treat the
extrapolation as illustrative)*. The curve is steep and generic across chess, not
variant-specific.

> **Consequence for us: decisiveness measured at any fixed strength is largely a strength
> artifact. Only *relative* decisiveness between variants at *matched* strength carries
> signal.**

## A logical error to avoid — and it is in our own epic

"Drawishness rises with strength, therefore the game is drawn" is **invalid**. The
implication runs one way only: `value = draw` implies the draw rate tends to 1, but at
finite strength a *theoretically won* game also looks drawn whenever the win lies beyond
both engines' horizon — exactly the situation in long tablebase-won endgames.

A rising draw rate is **consistent with** a drawn value and cannot distinguish it from
"won but unreachable."

This bears directly on the target written in
[`../epics/balance/README.md`](../epics/balance/README.md) §1: *"a variant whose
equilibrium value is a draw."* That property is **not measurable by this method**, and
the target needs restating in terms of what self-play can actually support.

## Exploitability does not transfer

`NashConv` / exploitability is central in imperfect-information research because there
self-play score is worthless as a diagnostic — always-Rock scores 50% against itself
while being maximally exploitable. Three reasons it does not solve our problem:

1. **Wrong object.** Exploitability is a property of a *strategy profile*, not of a game.
   There is no "exploitability of a variant"; the game-level analogue is the value
   itself, which is the uncomputable quantity.
2. **Intractable rather than inapplicable** at chess scale.
3. **Perfect information removes the motivating pathology** — pure subgame-perfect
   equilibria exist, so a symmetric self-play score is far more informative here than in
   poker.

### One tractable analogue worth building

> **Flagged by the researcher as their own extrapolation, not literature.**

**Tablebase-referenced error rate.** Retrograde-analyse ≤5-piece endgames *per variant* —
cheap, because the flags only change move generation — then measure how often the
engine's chosen move changes the exact theoretical value.

That is a genuine, **exactly computable** distance-to-optimal. It validates that agents
are near-optimal in the regions that decide games, and it is comparable across variants.
It is the only proposal here that measures optimality rather than proxying it.

## EGTA: the statistics transfer, the machinery does not

Empirical Game-Theoretic Analysis induces a normal-form meta-game over a restricted
strategy set by simulation, then solves it. **Our meta-game is degenerate** — the
strategy space is "play optimally", the equilibrium is Zermelo's, there is nothing to
solve. Strategy exploration and equilibrium solvers do not transfer.

Two things do:

- **Noisy-payoff statistics** (Tuyls et al. 2018; Rowland et al. 2019) — how simulation
  error propagates into ranking confidence. Directly our problem, with "variant" in place
  of "strategy profile".
- **The restricted-set caveat, formalised.** In EGTA an equilibrium of a restricted game
  can be *destroyed* when a stronger strategy is added. That is precisely our
  strength-dependence problem, and EGTA's reporting discipline — always state the
  restriction — is the norm to adopt.

## Nash averaging: the right frame is agents × tasks

Balduzzi et al., *Re-evaluating Evaluation* (NeurIPS 2018) decompose evaluation into
transitive and cyclic parts; the key property is **invariance to redundancy** — adding
near-duplicate agents or easy tasks does not bias the result.

**Their agent-vs-task setting is our frame: engines are agents, variants are tasks.**
With thousands of variants, many differing only in a flag for a rarely-relevant piece,
naive averaging across variants *is* redundancy-biased. Nash averaging over the
engine × variant matrix identifies which variants are **non-redundant and
discriminating** — though it does not say which is balanced, that being a within-cell
statistic.

α-Rank addresses intransitivity in *agent* populations and has no direct role here.

**Elo has a defect that does bite us:** it folds draws into a single score, so 55% means
very different things at 10% versus 80% draw rate. **Report W/D/L separately, never a
single Elo.**

## Sample sizes, with the correct variance

Per-game score variance is `p_w + 0.25·p_d − μ²`, so **the draw rate dominates the
cost** — a drawish variant is far cheaper to measure than a decisive one.

| Regime | (W/D/L) | σ² | n/arm: 52% vs 55% | n: W≠50% by 3pts |
| --- | --- | --- | --- | --- |
| Drawish | .12/.80/.08 | 0.050 | ~865 | ~432 |
| Decisive | .35/.40/.25 | 0.148 | ~2,573 | ~1,286 |

So roughly 1–3k games per pairwise claim. Two multipliers:

- **Paired colour-reversed openings** with pentanomial scoring cut variance materially.
- **Multiplicity inflates it.** 4,096 uncorrected tests at α = .05 yield **~205 false
  positives**. Bonferroni raises n by ~3.5×, to **6–9k games per protected claim**.

## Komi as prior art, and the winner's-curse problem

Go is the cleanest natural experiment: komi was raised from 0 through 4.5 and 5.5 to
today's 6.5/7.5 **as play strengthened**. Balance calibrated at one competence did not
survive the next. KataGo makes this explicit by *randomising* komi during self-play so
the value net conditions on it and the win-rate-versus-komi curve can be read off,
locating the 50% crossing directly.

The structural lesson matters more than the history:

- A **continuous** parameter yields a smooth estimand (the crossing point) with a
  confidence interval, and supports interpolation.
- **Discrete selection among thousands of cells yields a winner's curse** — the argmax of
  noisy estimates is optimistically biased. Whatever variant "wins" is partly winning
  because its noise was favourable.

> **The recovery is to exploit our factorial structure.** Model the score as flag main
> effects plus two-way interactions — **79 parameters for a 2¹² design** — rather than
> as 4,096 independent cells. That restores continuity, enables shrinkage toward the
> model, and is far more robust than ranking cells.
>
> This strengthens the factorial framing already chosen in the balance epic: the primary
> result should be **flag main effects with confidence intervals**, not a leaderboard.

*(Whether a specific fractional design of 128/256/512 runs achieves resolution V for 12
factors needs a design-table check — unverified.)*

## The confound most likely to invalidate our study

**A chess-tuned engine is differentially weaker in variants that deviate most from
chess**, systematically biasing those variants toward looking decisive and imbalanced.

Our engine is being tuned on `BRQ---`. Every variant far from it would be measured by an
engine that plays it badly — and "the engine plays this badly" would be recorded as "this
variant is decisive."

Mitigate by tuning per variant (as AlphaZero did, training each variant separately) or by
measuring and reporting a per-variant strength proxy. **This is not a minor caveat; it is
the main threat to validity.**

## Recommended protocol

1. **Pre-register** metrics, engine, time controls, opening set, adjudication and
   analysis plan. With thousands of cells, post-hoc metric choice is fatal.
2. **Audit the strength confound** above.
3. **Design:** paired colour-reversed openings, pentanomial scoring, fixed hardware,
   contempt disabled, explicit repetition/50-move handling — note portal moves may raise
   repetition rates.
4. **Stage 1 — screen everything** at low time control, ~200 paired games each; reject
   degenerate variants; fit the hierarchical factorial model and report **flag main
   effects with CIs as the primary result**.
5. **Stage 2 — top 20–50** on *fresh* games at 10× and 100× time. **Never estimate and
   select on the same data.**
6. **Stage 3 — final 2–5** with large N, at least two engine families (alpha-beta and
   MCTS/NN), plus the tablebase error-rate check.
7. **Report:** raw W/D/L counts; Wilson or Dirichlet intervals; the full strength ladder
   with Kendall τ rank-stability between adjacent levels; multiplicity correction; a
   held-out re-estimate of the selected variant; and the 80%-power minimum detectable
   effect.

### The claim we may make, and the ones we may not

**Permitted:** *"Under engine family E at time control T with opening set O, variant X's
White score is 0.502 [0.489, 0.515] and draw rate 0.61, and the |W−0.5| trend is
monotone decreasing across a 100× compute ladder; the ranking is stable (τ = 0.8) across
levels."*

**Forbidden:** that X is drawn; that its equilibrium is "better"; or that failing to
reject 50% establishes balance.

## Sources

- Tomašev, Paquet, Hassabis, Kramnik (2020), *Assessing Game Balance with AlphaZero* — https://arxiv.org/abs/2009.04374
- Wellman (2006), *Methods for EGTA* — https://cdn.aaai.org/AAAI/2006/AAAI06-248.pdf
- Wellman, Tuyls, Greenwald (2025), *EGTA: A Survey*, JAIR 82 — https://arxiv.org/abs/2403.04018
- Tuyls et al. (2018), *A Generalised Method for EGTA* — https://arxiv.org/pdf/1803.06376
- Balduzzi et al. (2018), *Re-evaluating Evaluation* — https://arxiv.org/pdf/1806.02643
- Omidshafiei et al. (2019), *α-Rank* — https://www.nature.com/articles/s41598-019-45619-9
- Rowland et al. (2019), *Multiagent Evaluation under Incomplete Information* — https://arxiv.org/abs/1909.09849
- Timbers et al. (2022), *Approximate Exploitability* — https://arxiv.org/pdf/2004.09677
- Wu (2019), *Accelerating Self-Play Learning in Go* (KataGo, komi randomisation) — https://arxiv.org/pdf/1902.10565
- Brams & Ismail (2021), *Fairer Chess* — https://arxiv.org/abs/2108.02547
- Komi (Go) — https://en.wikipedia.org/wiki/Komi_(Go)
- Draw-rate vs Elo analysis (blog, unrefereed) — https://beuke.org/chess-engine-draws/
