# Research — automated game design and whether "fun" can be measured

> Round 2, stream 2 of 5, 2026-08-02. See [`README.md`](./README.md).
> Browne's thesis and the Ludii source were read directly; several papers are paywalled
> and are flagged.

## The honest verdict, first

**"Fun" cannot be operationalised from self-play alone.** The defensible claim is
narrower and still useful:

> Self-play reliably **detects non-games** — degenerate, unbalanced, drawish, forced,
> trivially short or skill-insensitive variants — and can rank the survivors on
> *specific, named dynamical properties*. **It cannot rank them on enjoyment.**

The field's settled position is that these metrics are **necessary-condition filters that
reject bad games, not sufficient conditions that identify good ones**. Every serious
system terminates in human judgement: LUDI in a player survey, GAVEL in expert
evaluation, and DeepMind's chess-variant study in **Kramnik's** assessment — he was a
co-author precisely because the numbers could not deliver the verdict.

## Cameron Browne's LUDI — the closest prior art, and what it really showed

Browne's 2008 PhD asked our exact question: can game quality be measured by self-play
well enough to steer a search for new games? LUDI scored games on **57 aesthetic
criteria** — 16 *intrinsic* (from the rules), 30 *quality* (trends in play), 11
*viability* (outcomes).

Validation against 628 paired human comparisons over 79 games:

| Criteria used | Correlation with human preference |
| --- | --- |
| Intrinsic only (rules alone) | **r = 0.094** |
| Quality | 0.426 |
| **Viability** | **0.593** |
| All 57 | 0.417 |
| Hand-tuned best-17 | **0.821** [CI 0.562, 0.933] |

**Two findings matter for us.** First, **rules alone predict essentially nothing**
(r = 0.094) — you have to actually play the games. Second, **the viability criteria
carried most of the signal**, and they are the cheap ones: completion, balance,
drawishness, duration.

The six most load-bearing individual criteria: Uncertainty (late), Killer moves,
Permanence, **Lead change (negatively weighted)**, Completion, **Duration (negatively
weighted)**. Note that two of the six count *against* the property — more lead changes
and longer games were *disliked*.

**Read the 0.821 sceptically.** The best-17 subset was *selected* by search over 57
criteria on the same 79 games; cross-validation was applied to the regression, not to the
subset selection. Browne says so himself — *"It would be dubious to assume that these
results reveal universal truths"* — and concedes that depth was never solved: *"a concrete
measurement of depth is yet to be defined."* The success count of the whole programme is
**one** game, Yavalath, which did go on to be published and well regarded.

## Ludii — a real, code-level metric catalogue

Browne's successor system defines **428 concepts**, and its metrics package (verified
directly from the repository) is the closest thing to an off-the-shelf catalogue:

- **outcome** — `AdvantageP1`, `Balance`, `Completion`, `Drawishness`, `OutcomeUniformity`, `Timeouts`
- **duration** — `DurationTurns`, `DurationTurnsStdDev`, `DurationTurnsNotTimeouts`
- **complexity** — `DecisionMoves`, `GameTreeComplexity`, `StateSpaceComplexity`
- **coverage** — `BoardCoverageDefault/Full/Used`
- **state evaluation** — `LeadChange`, `Stability`, `ClarityNarrowness`, `DecisivenessMoves`
- **multiple** — `BranchingFactor`, `Drama`, `MoveDistance`, `MoveEvaluation`
- **designer** — `IdealDuration`, `SkillTrace` (doubles agent iterations across ~8 levels
  and regresses strong-versus-weak win rate — a depth proxy)

**GAVEL** (Togelius et al. 2024) uses six of these as an evolutionary fitness and states
plainly that they "capture general and **minimal** criteria… satisfying our evaluation
metrics alone is far from **sufficient** evidence for a game being interesting."

## Game refinement theory — deprioritise it

`GR = √B / D` (branching factor over game length), with a claimed "sophisticated" band of
0.07–0.08 that chess (0.074), Go (0.076) and several sports fall into.

**It is nearly useless for our problem by construction:** it is a function of exactly
**two aggregates**, and hundreds of our variants will share near-identical branching
factor and length. It cannot discriminate among them.

The theory is also weaker than its citation count suggests: the derivation introduces a
free exponent and then discards it; the mechanism is admitted to be unknown ("we do not
yet know about the physics of information in the brain"); the 0.07–0.08 band is fitted
post hoc to games already known to be popular, with no held-out prediction and no negative
controls; and the authors themselves acknowledge the *sophistication–population paradox*
(Go outscores soccer while having vastly fewer players).

**No independent peer-reviewed critique could be located** — the corpus is almost entirely
one research group. That insularity is a warning, not a clearance.

## What the AlphaZero variant study actually measured

[Tomašev, Paquet, Hassabis & Kramnik (2020)](https://arxiv.org/abs/2009.04374) is
structurally our experiment. Their self-play measures: expected score / first-move
advantage; draw rate and decisiveness with Bayesian pairwise comparison; game length;
**per-variant piece values**; special-move frequency; and — the best idea to steal —
**opening diversity as policy entropy** `H` over the first 20 plies, reported as an
**effective candidate-move count `m(s) = exp(H(s))`**.

That is a substantially better richness measure than raw branching factor, because it
counts moves the policy actually considers rather than moves that merely exist.

## RAPP — the best-founded "is this a real game" test

Togelius & Schmidhuber framed fun as **learnability**: a good game is one an agent
measurably improves at. Nielsen, Togelius et al. formalised this as **Relative Algorithm
Performance Profiles** — a good game is one where **stronger algorithms reliably beat
weaker ones** — and applied it to *chess-like games* specifically.

The caveat Browne raises applies: deeper search wins more in *any* game ("deepening
positivity"), so the signal is the *shape and persistence* of the curve, not its
existence.

## Three cautions that bear directly on our design

1. **Every metric is a function of the agent, not of the game.** Draw rate especially.
   **Report each metric as a curve over compute, not a scalar.** A variant that is
   decisive at 1k playouts and 100% drawn at 1M is not a good game — and we would have
   recorded it as decisive.
2. **"Best Nash equilibrium" has no referent in this literature.** Nothing here ranks
   equilibria; everything ranks *play near* equilibrium under bounded-rational agents.
   That is the right target, and we should say so explicitly rather than implying more.
3. **Thousands of variants is a multiple-comparisons machine.** Two-stage design, a
   pre-registered shortlist, confirmation runs with intervals, then human playtesting on
   the top 3–5. **Do not fit metric weights to your own playtest data and then report the
   fit as validation** — that is precisely the flaw in LUDI's 0.821.

Also worth internalising: the sports-economics **uncertainty-of-outcome hypothesis** —
the closest thing to an empirical test of "uncertainty ⇒ enjoyment" on real audiences —
has **mixed-to-poor support**. Do not treat "maximise uncertainty" as a law.

## Ranked metric shortlist

### Tier 1 — viability gates (cheap, reject variants, strongest support)

1. **Completion / non-timeout rate** — a variant that does not terminate is not a game.
2. **Balance / first-player advantage** — a large edge kills a two-player abstract.
3. **Decisiveness and draw rate, measured across engine strengths** — must be a curve.
4. **Duration distribution (mean and standard deviation)** — Browne weighted duration
   **negatively**; overlong variants were disliked.

### Tier 2 — quality discriminators (costlier, weaker, still defensible)

5. **Skill differentiation (RAPP / Elo-versus-compute slope)** — the best-founded "is this
   a real game" test.
6. **Policy entropy and effective candidate moves `m = exp(H)`** — strictly better than
   raw branching factor.
7. **Uncertainty (late)** — Browne's strongest individual predictor. Requires a
   *trustworthy* per-variant evaluator; a weak evaluation manufactures fake uncertainty.
8. **Mirror-mechanic utilisation** — fraction of games where a cross-seam move is played
   at all, and where one is decisive. *(The researcher's own addition, honestly flagged as
   having no literature citation; nearest analogue is Ludii's coverage.)* **A variant whose
   flags are never exercised is standard chess wearing a hat — and with this many flags,
   many will be.**
9. **Board and piece coverage** — cheap sanity check.
10. **Lead change** — compute it, but Browne found it **negatively** weighted. Do not
    assume more is better.
11. **Distance from the all-flags-off baseline** — is this variant meaningfully different
    at all?

### Deprioritise

Game refinement (degenerate across our space); state-space and game-tree complexity
(near-constant across our variants, and a poor quality proxy anyway).

### Requires human input — no substitute exists

Overall preference; rule comprehensibility and learnability of the seam mechanic; whether
emergent tactics feel *interesting* rather than merely *different*; strategic richness at
human rather than engine strength.

**Protocol:** Browne's paired comparison ("which is the better game?") on the top 3–5
survivors with enough comparisons per pair for usable intervals — and, following
DeepMind's example, at least one strong player giving a qualitative read.

## Sources

- Browne, C. (2008) *Automatic Generation and Evaluation of Recombination Games*, PhD thesis, QUT — https://eprints.qut.edu.au/17025/ — **read directly**
- Browne & Maire (2010) *Evolutionary Game Design*, IEEE TCIAIG 2(1) — https://eprints.qut.edu.au/31909/ *(abstract only, paywalled)*
- Browne (2012) *Yavalath* — https://cambolbro.com/games/yavalath/
- Piette et al. (2019) *An Overview of the Ludii General Game System* — https://arxiv.org/abs/1907.00240
- Piette et al. (2021) *General Board Game Concepts* — https://arxiv.org/abs/2107.01078
- Ludii source, metrics package — https://github.com/Ludeme/Ludii — **catalogue read from the repo**
- Todd, Padula, Stephenson, Piette, Soemers, Togelius (2024) *GAVEL* — https://arxiv.org/abs/2407.09388
- Tomašev, Paquet, Hassabis, Kramnik (2020) *Assessing Game Balance with AlphaZero* — https://arxiv.org/abs/2009.04374
- Nossal & Iida, *Game Refinement Theory* — https://dspace.jaist.ac.jp/dspace/bitstream/10119/12742/1/21333.pdf
- Togelius & Schmidhuber (2008) *An Experiment in Automatic Game Design*
- Nielsen, Barros, Togelius, Nelson — RAPP and *Evolving Chess-like Games* *(paywalled; worked from secondary descriptions)*
- Liu, Togelius, Pérez-Liébana, Lucas (2017) *Evolving Game Skill-Depth* — https://arxiv.org/abs/1703.06275
- Uncertainty-of-outcome hypothesis review — https://link.springer.com/article/10.1007/s11151-023-09899-w
