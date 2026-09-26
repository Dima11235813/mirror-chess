# Research — experimental design over the rule-flag space

> Round 2, stream 1 of 5, 2026-08-02. See [`README.md`](./README.md).
> Ran against a 12-flag / 4,096-cell assumption. Stream 5 has since reduced the space to
> **10 flags / 1,024 cells** ([`variant-precedent.md`](./variant-precedent.md)); see
> §7 for what changes. The methodology is unaffected — only the run counts shrink.

## The fact that reframes the whole problem

> **Estimating a *main effect* averages over half the design.** In a 256-cell design that
> is 128 cells, so a main effect's standard error is ~√128 ≈ **11× smaller** than a
> single cell's.
>
> At 200 games per cell: **±5 points per cell, but ±0.4 points per main effect.**

Screening is cheap. **Per-cell ranking is what costs money.** That single asymmetry is
why the study is affordable at all, and it independently corroborates the
"report main effects, not a leaderboard" conclusion reached by
[`equilibrium-and-balance.md`](./equilibrium-and-balance.md) from the winner's-curse
direction.

## The cost unit

A game score is `S ∈ {0, ½, 1}`, so with draw rate `d`, `Var(S) = (1−d)/4` and
`sd = 0.5·√(1−d)`.

| Games/cell | ±95% CI at d=0.5 | at d=0.3 |
| --- | --- | --- |
| 200 | 4.9 pts | 5.8 pts |
| 550 | 3.0 | 3.5 |
| 1,200 | 2.0 | 2.4 |
| 4,000 | 1.1 | 1.3 |

Draw *rate* is noisier per game than score (`sd = √(d(1−d))`, ±6.9 pts at n=200) — worth
knowing, since draw rate is one of our headline metrics.

**Bias control:** use one fixed, balanced opening book across every cell, and report white
score **relative to the all-off control**. Book bias then cancels in the difference —
another use for the control we get free from `------` being ordinary chess. Pair games
(same opening, colours reversed) with pentanomial accounting. *(Fishtest documents
pentanomial as a "substantial saving" but publishes no numeric factor, so none is quoted
here.)*

## Screening designs: go resolution V, and skip Plackett–Burman

| Design | Runs | Res | What is lost |
| --- | --- | --- | --- |
| 2^(12−8) | 16 | III | Main effects aliased with two-factor interactions — **unusable** |
| 2^(12−7) | 32 | IV | Main effects clean; 2FIs aliased in chains |
| 2^(12−4) | 256 | **V** | All 12 main effects **and all 66 2FIs** clean |

**Plackett–Burman is the wrong tool here.** Its main effects are biased by *every* 2FI not
containing that factor, at ±1/3 — and `quiet_queen × capture_queen` is almost certainly a
large interaction. Resolution III designs fail for the same reason.

**Hard bound worth remembering:** a main-effects-plus-all-2FI model has
`1 + 12 + C(12,2) = 79` parameters, so **no design under 79 runs can be resolution V.**

*Flagged uncertain:* NIST's catalogue stops at 11 factors, so the 256-run res-V figure for
12 is inferred from the standard sequence (6/8/11/17 factors at 32/64/128/256 runs).
Verify in R's `FrF2` before committing.

## Sequential allocation — and where it does *not* help

**The framing matters more than the algorithm.** UCB and Thompson sampling minimise
*cumulative regret*, which is the wrong objective: they starve exactly the arms we still
need to characterise.

- If the goal were "estimate every cell well", the right theory is Neyman allocation, and
  **adaptivity would buy almost nothing** — our variances differ only through draw rate,
  a ≤1.4× spread. *That is precisely why the answer must be "don't estimate every cell."*
- Our actual goal — **"find the cells with |score − ½| ≤ ε"** — is exactly the
  **thresholding / level-set bandit** (Locatelli, Gutzeit & Carpentier, ICML 2016),
  which is optimal for a fixed budget.
- **Successive halving fits well, and is better behaved here than in machine learning**:
  our low-fidelity rung (fewer games) is an *unbiased* noisy estimate, not a biased proxy.
  Hyperband's outer loop is therefore unnecessary — plain SH with η=2 suffices.

## Racing and algorithm configuration

**F-Race** (Birattari et al. 2002) evaluates configurations round-robin on *instances* and
eliminates them with a Friedman test blocked by instance. **Directly transferable**: our
instances are opening positions, and blocking on opening is a genuine variance reducer.

**irace** iterates F-Race, resampling toward elites — it is an **optimiser**, so it
converges on a small elite and will *not* produce a map of the hypercube. Use it only to
hunt the balanced set, with cost `|score − ½|`.

**ParamILS** and **SMAC** both handle binary spaces natively; 10–12 binary parameters is
trivial for them, and SMAC's random-forest surrogate is a pragmatic alternative to a
hand-built design.

> **Racing beats factorial when you only need a winner; factorial beats racing when you
> need effect structure and a defensible landscape.** We need both — hence a staged
> protocol rather than a choice.

## Surrogate modelling

A function on `{0,1}^k` has an exact Walsh/Fourier expansion; truncating at order 2 gives
the 79 terms above. **BOCS** (Baptista & Poloczek, ICML 2018) is precisely this — sparse
Bayesian linear regression on binary monomials with a horseshoe prior. **COMBO** (Oh et
al. 2019) is more expressive and overkill at this dimensionality.

**256–384 measured cells (6–9% of a 4,096 space) comfortably identifies a sparse order-2
model.** The defensible simple version: LASSO or horseshoe regression on all 79 terms,
plus a random forest as a non-parametric check.

> **Report held-out R² and residual standard deviation on cells never used for fitting.**
> If the residual sd greatly exceeds measurement noise, the order-2 assumption is broken
> and the model must not be used to extrapolate.

## Multi-objective — starting with a modelling bug

**"Near 0.5" is a target, not a monotone objective.** Pareto dominance is undefined until
it is transformed to `|score − ½|` (minimise). Getting this wrong would silently corrupt
every front.

- Build the front by non-dominated sorting (NSGA-II's machinery, not its GA).
- **Avoid linear scalarisation as the primary lens** — weighted sums provably cannot reach
  non-convex regions of a front (Das & Dennis 1997). Chebyshev scalarisation can.
- Practical honest presentation: **hard-filter on non-negotiables** (draw rate ≤ some
  ceiling, plausible game length, portal usage above a floor), then show the front over
  the remaining 2–3 objectives with CIs on every cell.
- **Winner's curse again:** the empirical front is optimistically biased under noise.
  **Re-run every front member on a fresh independent sample before publishing.**

## The recommended protocol — ~16× cheaper than brute force

| Stage | What | Games | What it decides |
| --- | --- | --- | --- |
| **0 — Control** | all-off vs standard chess; fix book, time control, pairing | 6k | Harness is unbiased; measures cost/game and draw spread |
| **1 — Res-V screen** | 256-cell design × 200 games | 51k | All main effects + all 2FIs at **±0.4 pts**. Answers "which flags matter, and do a piece's quiet and capture flags interact?" |
| **2 — Surrogate** | +128 cells (D-optimal augmentation) × 200 | 26k | Order-2 model on 384 cells; predict the rest; **report held-out R²** |
| **3a — Race** | 128 predicted-balanced cells, successive halving η=2 (128×200 → 64×400 → 32×800 → 16×1600) | 102k | Narrows to 16 without spending on predicted-bad cells |
| **3b — Confirm** | final 16 × 4,000 games, **fresh sample** | 64k | ±1.1 pts; Pareto front with CIs |
| | **Total** | **~249k** | versus 4.1M naive |

**Gate between stages:** if stage 2's held-out residual sd exceeds ~1.5× measurement
noise, spend stage 3a's budget on 256 *more design cells* (third-order terms) instead of
racing. Do not race on a model that does not fit.

## §7 — What the reduction to 10 flags changes

> **Stale as written — corrected 2026-09-22. The space is 6 flags / 64 cells.** The owner
> established that a piece attacks exactly where it can move (spec §2.1), retiring §12's
> quiet/capture split as the default: each non-pawn piece has one portal right, the pawn
> has capture-only. → [`../epics/rules/adjacent-kings.md`](../epics/rules/adjacent-kings.md)
>
> **Most of this document is now unnecessary, and that is a good outcome.** Fractional
> designs, surrogate models, racing and successive halving all exist to avoid measuring
> thousands of cells. At 64 cells the **full factorial is cheaper than the machinery that
> would approximate it**: 22 parameters over 64 measured cells, nothing aliased, nothing
> predicted. Keep the file — if the split ever returns as a study axis, the design work is
> done and waiting.
>
> What still applies at any size: the cost unit in §"The cost unit", the winner's curse,
> the "re-run every front member on a fresh sample" discipline, and the warning that
> "near 0.5" is a target rather than a monotone objective.

Stream 5 established that the king's two flags must be constrained equal (or the two
kings can stand adjacent across the seam) and that a pawn's quiet portal is a no-op — so
the space is **10 flags / 1,024 cells**, not 12 / 4,096.

Everything above still holds; the numbers shrink:

- An order-2 model needs `1 + 10 + C(10,2) = 56` parameters, so resolution V needs
  **≥ 64 runs** rather than ≥ 79 — likely a 128-run design by the standard sequence
  (**verify in `FrF2`**).
- Stage 1 becomes ~128 cells × 200 games ≈ 26k, and the whole protocol lands nearer
  **~150k games**.
- The main-effect precision advantage is slightly smaller (√64 = 8× rather than 11×) but
  the conclusion is unchanged: **screening is cheap, per-cell ranking is not.**

## Sources

- NIST/SEMATECH e-Handbook, fractional factorial catalogue — https://www.itl.nist.gov/div898/handbook/pri/section3/pri3347.htm
- Oehlert & Whitcomb, *Small, Efficient, Equireplicated Resolution V Fractions* — https://cdnm.statease.com/pubs/small5.pdf
- Birattari et al., *A Racing Algorithm for Configuring Metaheuristics* (F-Race) — https://iridia.ulb.ac.be/~stuetzle/publications/GECCO02.pdf
- López-Ibáñez et al., *The irace package* — https://www.sciencedirect.com/science/article/pii/S2214716015300270
- Hutter et al., *ParamILS* — https://jair.org/index.php/jair/article/view/10628 · *SMAC* — https://www.cs.ubc.ca/~hutter/papers/10-TR-SMAC.pdf
- Li et al., *Hyperband* — https://jmlr.org/papers/volume18/16-558/16-558.pdf
- Locatelli, Gutzeit & Carpentier, *Thresholding Bandit* — https://arxiv.org/abs/1605.08671
- Baptista & Poloczek, *BOCS* — https://arxiv.org/pdf/1806.08838 · Oh et al., *COMBO* — https://arxiv.org/abs/1902.00448
- Deb et al., *NSGA-II* — https://sci2s.ugr.es/sites/default/files/files/Teaching/OtherPostGraduateCourses/Metaheuristicas/Deb_NSGAII.pdf
- Das & Dennis, *drawbacks of weighted sums* — https://link.springer.com/article/10.1007/BF01197559
- Browne & Maire, *Evolutionary Game Design* — https://eprints.qut.edu.au/31909/
- Fishtest statistical methods — https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html
