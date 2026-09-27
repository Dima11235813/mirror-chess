# Research — statistical methodology for self-play measurement

> Round 2, stream 4 of 5, 2026-08-02. See [`README.md`](./README.md).
> Sources are Fishtest docs, Van den Bergh's papers, live Stockfish commit data and
> cutechess docs; the arithmetic was worked rather than quoted.

## Escalation 1 — Fishtest's paired openings are *counterproductive* for us

**Two other streams recommended colour-reversed paired openings.** This stream derives
that they make our estimate **worse**, and the algebra is convincing.

Write a White-perspective result as `U = ½ + b + h + ε`, where `b` is the opening's bias
and `h` is the ruleset's first-move effect.

| Study | Estimator | Effect |
| --- | --- | --- |
| **Fishtest** (engine A vs B) | `(U₁ − U₂)/2 → e` | opening bias `b` **cancels** |
| **Ours** (same engine both sides) | `(U₁ + U₂)/2 → ½ + b + h` | engine gap is already zero; bias is **reinforced** |

Concretely, with within-position noise `v` and book-bias variance `β²`:

- N independent openings, one game each: `Var = (β² + v)/N`
- N/2 openings played colour-reversed: `Var = (2β² + v)/N`

> **Colour-reversed pairing is strictly worse for measuring a game's White advantage.**
> Copying Fishtest practice unexamined would have systematically biased every balance
> number in the study.

**The correct analogue is antithetic *mirrored-position* pairs.** For each opening `O`,
also play its colour-mirrored twin `O′`, so `b_{O′} = −b_O`. Then `Var = v/N`: the bias
variance vanishes *and* `E[b] = 0` by construction, killing a systematic confound rather
than merely averaging it down.

Using reported book-bias magnitudes (≈53–81 Elo SD → β ≈ 0.076–0.117), `β²/v ≈ 8–11%` at
d = 0.5 — the same order as the 9–17% variance compression Fishtest observes from
pentanomial pairing, which is a reassuring cross-check on the algebra.

### Reconciling the three streams

They are not really in conflict; they answered different questions.

- [`equilibrium-and-balance.md`](./equilibrium-and-balance.md) and
  [`experimental-design.md`](./experimental-design.md) recommended pairing **as
  standard engine-testing practice**, which it is.
- This stream asked what that practice does **to our estimator specifically**, and found
  the sign flips.

**Adopt mirrored-position antithetic pairs, not colour-reversed pairs.** And note we have
a second mirror available that no chess study has: our rules are invariant under
**file reversal**, so a file-mirrored position is an exact rules-level twin.

## Escalation 2 — per-cell precision is unaffordable; the factorial is free

For `X ∈ {0, ½, 1}` at μ = ½ with draw rate `d`: `Var = (1−d)/4`, so `σ = ½√(1−d)`. This
is **strictly smaller than the naive binomial 0.25** by a factor `(1−d)` — using binomial
variance wastes `1/(1−d)` games, 3.3× at d = 0.7.

`N = 3.8416(1−d)/(4ε²)`:

| Draw rate | ±1.0 pp | ±0.5 pp |
| --- | --- | --- |
| 30% | 6,723 | 26,891 |
| 50% | 4,802 | 19,208 |
| 70% | 2,881 | 11,525 |

**At 4,096 cells: 19.7M games for ±1 pp per cell, 78.7M for ±0.5 pp** — and with
Bonferroni, 97M / 390M. That is weeks to years of compute. **Per-cell precision is not
affordable at any realistic budget. Do not plan for it.**

But with `n` games per cell and `N = 4096n` total:

| Estimand | SE |
| --- | --- |
| a single cell | `σ/√n` |
| a main effect (2048 vs 2048 cells) | `2σ/√N` |
| a two-way interaction | `4σ/√N` |

**Ratio of per-cell to main-effect SE = √4096 / 2 = 32×.** At n = 200 and d = 0.5:
per-cell 95% CI **±4.9 pp** (useless); main effect **±0.15 pp**; interaction **±0.31 pp**.
And there are only 12 + 66 = **78** factorial contrasts, so Bonferroni costs z = 3.41 — a
3× variance penalty on top of a 1024× variance gain.

*(This 32× and the 11× in [`experimental-design.md`](./experimental-design.md) are both
correct: 11× assumes a 256-cell fractional design, 32× a full factorial. The conclusion is
identical either way — screen broadly, never headline a cell.)*

## Escalation 3 — one repo check is worth more than any amount of compute

> **Do any flags make a standard-chess move illegal?**

If the flags only ever *add* moves, then standard-chess opening lines are legal in every
variant, one universal opening set works, and we get **common random numbers** across
cells — which makes every between-variant comparison paired, cancelling the shared
opening bias. That is the single biggest variance lever available.

**The answer is subtle and worth stating carefully.** Enabling a flag only adds
*pseudo-legal* moves — but it also gives the opponent new attacks, so a move that was
legal can become **illegal by self-check**. Adding moves can therefore remove legal moves.

So the check is not "are the flags additive" (they are, pseudo-legally) but **"is every
line in the opening set legal under all rulesets?"** — verifiable cheaply by replaying
each candidate line under every ruleset and dropping any that fail. Short opening lines
with kings still safe will almost all survive.

## SPRT: usable, but not as the primary tool

Fishtest runs a GSPRT with α = β = 0.05 and bounds ±2.94. The mathematics never mentions
engines — it tests `μ = s₀` vs `μ = s₁` for a bounded discrete variable — so it
**transfers directly** by setting `μ = E[White score in variant V]` with `μ_ref = ½`.

Worked: δ = 0.5 pp at d = 0.5 gives ~43,400 games worst case, ~26,500 at the endpoints,
versus 54,120 for a fixed-N test — the advertised ~2× saving.

**But its stopped estimate is biased**: stopping when the statistic is extreme inflates
`|μ̂ − ½|`. Our deliverable is *estimates with intervals*, not decisions. **Use SPRT only
as a screening gate, then re-estimate on fresh fixed-N samples. Never quote a score rate
from an SPRT-terminated run.**

## Elo, Bradley-Terry and TrueSkill do not apply

All three estimate a **scalar latent skill per player**. In our design both players are
the same engine with the same ruleset, so the skill difference is **zero by
construction**. There is nothing to rate, and cross-variant Elo is meaningless because
the games differ.

Elo survives only as a communication unit: 1 pp of score ≈ 7 Elo at 50%.

**Normalized Elo is actively wrong for reporting**: it divides by `√(1−d)` precisely to
make results draw-rate-independent — and draw rate is one of our target metrics. Use it
for *sizing* tests, never for stating results.

**Draws:** Davidson and Rao–Kupper extend Bradley-Terry with a tie parameter, but all
treat draws as a *nuisance*. For us they are a **primary outcome** — model the raw
trinomial and report `d̂` with its own binomial interval.

## Variance reduction, ranked by value

**Highest — common random numbers.** Run every variant on the *identical* opening set
with identical seeds. Between-variant contrasts become paired and the shared bias
cancels. With deterministic play (fixed nodes, one thread, hash cleared) the baseline and
a rarely-firing variant produce *literally the same game* on many openings — paired
differences of exactly zero, correct information at near-zero variance.

**High — determinism.** Fixed nodes or depth removes timing jitter and makes results
hardware-independent. Cost: all randomness comes from the opening set, so opening count
*is* the effective sample size.

**High — control variate.** Report every variant as a difference from all-flags-off *on
the same opening*. This is what makes the calibration control do real statistical work
rather than just sanity-checking.

**Fiddly — the book itself.** A standard chess book cannot be assumed valid across
variants; see Escalation 3.

## Reproducibility, and why the book must be reported

Every number needs: engine commit and build flags; one thread, hash size, hash cleared
between games; **fixed nodes preferred over time control**; the flag vector; the opening
set (hash, generation procedure, ply depth, whether mirror-paired); seeds; and
adjudication settings — **adjudication directly changes draw rate and game length, which
are metrics.**

The book must sit next to every balance number because `E[b]` adds *directly* to the
White score. Not pedantry: Sonas measured White at 54.18% over 266k games while New In
Chess measured 54.8% over 731,740 — same game, different populations. Fishtest's UHO
books are *deliberately* unbalanced to cut draws, so a White score measured on one is
meaningless as "White's advantage".

## Recommended protocol

- **Stage 0 — calibration.** All-flags-off; confirm White score, draw rate and game length
  land in known chess ranges. If not, the harness is wrong — stop.
- **Stage 1 — screen.** ~500 games/cell. Per-cell CI ≈ ±3.1 pp (exploratory only); the
  factorial contrasts land at ±0.10 pp for main effects and ±0.19 pp for interactions.
  Apply Benjamini–Hochberg at q = 0.05 across the 78 contrasts — far more powerful than
  Bonferroni and the right guarantee for a screening pass.
- **Stage 2 — deep.** Only cells flagged by Stage 1: ~20,000 games for ±0.5 pp.
- **Stage 3 — SPRT**, optional, for binary questions, re-estimated on fresh samples.

Report per cell: flag vector, N games, N openings, W/D/L counts, White score ± CI, draw
rate ± CI, mean/median plies, decisiveness, mechanic-use rate, Δ versus baseline (paired)
± CI, engine commit, nodes/move, opening-set hash, adjudication settings, seed.

## Sources

- Fishtest Mathematics — https://official-stockfish.github.io/docs/fishtest-wiki/Fishtest-Mathematics.html
- Van den Bergh, *Comments on Normalized Elo* — https://cantate.be/Fishtest/normalized_elo_practical.pdf
- Van den Bergh, *The Accounting Identity* — https://cantate.be/Fishtest/accounting_identity.pdf
- fishtest `stat_util.py` — https://github.com/official-stockfish/fishtest/blob/master/server/fishtest/stats/stat_util.py
- TalkChess 69407, pentanomial variance compression — https://www.talkchess.com/forum3/viewtopic.php?t=69407
- cutechess-cli manual — https://github.com/cutechess/cutechess/blob/master/docs/cutechess-cli.6.txt
- Herbrich, Minka & Graepel, *TrueSkill* — https://papers.nips.cc/paper/3079-trueskilltm-a-bayesian-skill-rating-system
- Bradley & Terry (1952) — https://doi.org/10.2307/2334029
- Davidson (1970) — https://doi.org/10.1080/01621459.1970.10481082
- Benjamini & Hochberg (1995) — https://doi.org/10.1111/j.2517-6161.1995.tb02031.x
- First-move advantage in chess — https://en.wikipedia.org/wiki/First-move_advantage_in_chess
