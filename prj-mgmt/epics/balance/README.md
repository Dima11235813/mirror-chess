# Epic — Rule variants and balance

Make the mirror mechanic **configurable per piece**, build an engine that can play the
game, and use self-play to choose the default ruleset from evidence rather than taste.

---

## 1. The goal, stated precisely

The informal aim is "find the variant that best meets Nash equilibrium". That needs
restating before it can be built against.

Mirror Chess is a **finite, two-player, zero-sum, perfect-information** game. By
Zermelo's theorem every variant of it already *has* a determinate value under optimal
play — White wins, Black wins, or draw — and its Nash equilibria are exactly the
optimal strategy profiles. So no variant is "closer to equilibrium" than another;
they all have one. There is also nothing to solve for in the game-theoretic sense: no
mixed strategies, no equilibrium selection problem.

What we actually want is to **choose among variants by properties of play near
equilibrium**. Research on 2026-08-02 forced this to be stated more carefully than it
first was:

> **Target (revised).** A variant that survives the viability gates — it terminates, it
> is not lopsided, it is decisive at reachable strength, and it actually uses the
> mechanic — and that a strong human judges to be a good game.

### Three things the earlier target got wrong

1. **"A variant whose equilibrium value is a draw" is not measurable.** A rising draw
   rate is *consistent with* a drawn value but cannot be distinguished from "won, but
   beyond both engines' horizon" — exactly the situation in long tablebase-won endgames.
   The implication runs one way only.
2. **"Best Nash equilibrium" has no referent** in the automated-game-design literature.
   Nothing there ranks equilibria; everything ranks *play near* equilibrium under
   bounded-rational agents. Say that plainly rather than implying more.
3. **Every metric is a property of the agent, not of the game.** DeepMind measured
   classical chess at 54.1% for White at 800 simulations, 51.8% at 1s/move and **50.8% at
   1min/move** — measured imbalance roughly *halved* with two steps of compute
   ([arXiv:2009.04374](https://arxiv.org/abs/2009.04374)). **Report every metric as a
   curve over compute, never a scalar.**

### And "fun" is not measurable either — but non-games are rejectable

Cameron Browne's LUDI, the closest prior art, correlated its best hand-tuned criteria
with human preference at r ≈ 0.82 — on 628 first-impression votes, with the criteria
subset chosen on the same data. Its own author warns against reading universal truths
into it, and rules-only criteria predicted human preference at **r = 0.094**.

The defensible position, which every serious system in the field shares: **self-play
detects non-games and ranks survivors on named dynamical properties; humans decide which
is good.** LUDI ended in a player survey, GAVEL in expert evaluation, and DeepMind's
chess-variant study in Kramnik's judgement — he was a co-author for exactly that reason.

Details and the ranked metric shortlist:
[`../../research/game-quality-and-fun.md`](../../research/game-quality-and-fun.md).

## 2. Why the flags are per piece *and* per crossing

Spec §11.1 established two different crossings, so the flag space is not one switch:

| Flag | Piece | Crossing |
| --- | --- | --- |
| `B`, `R`, `Q` | sliders | transit (§4) — hop the seam mid-ray, keep sliding |
| `N`, `K`, `P` | steppers | landing (§11) — wrap the destination file |

Six independent booleans → **64 variants**, which is exactly a `2^6` full factorial
design. That is a gift: it lets us compute the *main effect* of each piece's portal on
balance, plus the interactions, rather than just ranking 64 opaque configurations.

> **Reaffirmed 2026-09-22, after a detour worth recording.** Spec §12 (2026-08-03) had
> split each piece's portal into two independent rights, making the space **2,048**
> rulesets and this section's "64 variants" look obsolete — it was rewritten that morning
> to say so. The owner then established the governing principle (spec §2.1): *the movement
> space expands, the rules stay the same*, so a piece attacks exactly where it can move.
> §12's split is retired as the default, and **64 is correct after all** — reached by a
> better argument than the one that first produced it.
> → [`../rules/adjacent-kings.md`](../rules/adjacent-kings.md)

`P` covers pawn *captures* only; whether a pawn **push** wraps is a seventh flag,
currently off and out of scope for the first study (it would double the runs and it
changes promotion geometry, which is a much bigger perturbation).

**All six on** is today's default. **All six off is standard chess** — see §4.

## 3. Order of work

Two items are hard prerequisites. Running the study without them measures a game we
do not intend to ship.

```
  draw-rules.md ──┐                         (rules epic — repetition, 50-move, limit)
  special moves ──┤                         (promotion above all)
                  ├──> search-engine.md ──> self-play-harness.md ──> variant-study.md
  rule-flags.md ──┘
```

> **Revised 2026-09-22 — the chain above is wrong in its first link, and measurement is
> what showed it.** Throughput was never the binding constraint; **evaluation** is. The
> engine scores every quiet move identically, so **18 of 18** self-play games ended in a
> repetition draw and a faster engine would only produce more of that data. The screen, it
> turns out, is affordable on today's engine (~4.5 h on 20 workers); throughput binds at
> the *confirmation* stage. → [`readiness-probe.md`](./readiness-probe.md)

```
  rule-flags.md ──┐
                  ├──> ../engine/evaluation.md ──> self-play-harness.md ──┬──> variant-study.md
  draw-rules.md ──┘        (the blocker)                │                 │
                                                        └──> analysis-project.md
                                                                          ↑
                                          search-engine.md ───────────────┘
                                     (throughput: needed for Stage 4, not the screen)
```

1. **[`../rules/draw-rules.md`](../rules/draw-rules.md)** — without repetition
   detection and a move cap, self-play games never end. Blocking.
2. **Special moves** (spec §8.4) — **promotion** changes endgame value more than any
   mirror flag; a study without it is measuring a different game. Castling and en
   passant matter less but should land together. Blocking for a *credible* study.
3. **[`rule-flags.md`](./rule-flags.md)** — the configuration itself. Independent of
   1–2; can proceed in parallel.
4. **[`../engine/engine-core.md`](../engine/engine-core.md)** and
   [`../engine/evaluation.md`](../engine/evaluation.md) — the search and the
   evaluation live in the [engine epic](../engine/README.md), because a playable opponent needs them first
   and needs them sooner. The study consumes them.
5. **[`search-engine.md`](./search-engine.md)** — the throughput work the *study*
   additionally needs. Measurement showed the opponent does not need it, so it is no
   longer on the critical path to playing a game.
6. **[`self-play-harness.md`](./self-play-harness.md)** — run games, record metrics.
7. **[`variant-study.md`](./variant-study.md)** — the experiment and the decision.

## 4. The control that keeps us honest

With all six flags off, Mirror Chess **is** standard chess — a game whose balance is
extremely well characterised. That gives the pipeline a free calibration:

> Before trusting any variant result, the harness must reproduce known values for the
> all-off control: White scoring modestly above 50%, and a draw rate that rises with
> engine strength.

If the control comes out wildly imbalanced, the finding is a bug in the harness or the
engine, not a fact about chess. **No variant result is reportable until the control
passes.** This is the single most valuable check in the epic and costs almost nothing.

## 4a. Methodology settled by research (2026-08-02)

Four findings change how the study must be run. Full detail in
[`../../research/`](../../research/README.md).

**Design around factorial contrasts, never around cells.** Per-cell precision is
unaffordable — ±1pp per cell across the space costs ~19.7M games — while a main effect
averages over half the design and lands **11–32× tighter for free**. At 200 games/cell:
±4.9pp per cell (useless) versus **±0.15pp per main effect**. Cells are exploratory
only; the headline result is main effects and two-way interactions. Ranking noisy cells
also invites a **winner's curse**: the argmax of noisy estimates is optimistically
biased, so every shortlisted variant must be re-run on a **fresh** sample.

**Use mirrored-position antithetic pairs, not colour-reversed pairs.** Copying standard
Fishtest practice would have made our estimate *worse*. Their estimator is
`(U₁ − U₂)/2`, which cancels opening bias; ours is `(U₁ + U₂)/2`, which **reinforces**
it — because our two players are identical, so there is no engine gap to isolate. Pairing
each opening with its **colour-mirrored twin** makes `E[bias] = 0` by construction.

**A universal opening set does not work — measured, not assumed.** The hope was that one
opening set shared by every variant would give **common random numbers**, making all
between-variant comparisons paired. It fails: enabling a flag adds pseudo-legal moves but
also hands the opponent new attacks, so legal moves can vanish by self-check.

Measured against our own engine: **divergence starts at ply 3** (0.13% of moves, 2.9% of
positions) and reaches **0.51% of moves and 7% of positions by ply 5**. The earliest case
is `1.d3 b6 2.Ke1-d2?` — illegal because Black's *home-square* bishop on `c8` checks `d2`
by leaving via the a-file and returning along the far side.

This turns the opening-set choice into a genuine variance-versus-bias trade-off with no
free option — see [`../../research/opening-set-legality.md`](../../research/opening-set-legality.md).
Note the filtering trap: a book chosen because every line is legal in all variants is, by
construction, a book that **avoids early seam activity** — understating the very thing
being measured.

**The main threat to validity is our own engine.** A chess-tuned engine is
*differentially weaker* on variants that deviate most from chess — and "the engine plays
this badly" would be recorded as "this variant is decisive." Mitigate by tuning per
variant (as AlphaZero did) or by measuring and reporting a per-variant strength proxy.

## 5. Open decisions

- **[decision] What "rich" means.** Draw rate and decisiveness are measurable; so is
  branching factor. "Strategically interesting" is a judgement the owner has to make,
  informed by actually playing the top candidates. The study should shortlist, not
  crown.
- ~~**[decision] Engine class.**~~ **Settled 2026-09-22: alpha-beta with weights tuned per
  ruleset by Texel regression.** Not a neural evaluation — deferred with an explicit
  trigger in [`../engine/evaluation.md`](../engine/evaluation.md) §7. The circularity is
  handled by one round of iteration (§5 there): screen with a cheap discriminating
  evaluation, then derive values for the shortlist and re-run it.
- **[decision] Whether the default ruleset may differ from "all on".** The study is
  pointless if the answer is predetermined.
- ~~**[decision] How large the flag space is.**~~ **Settled 2026-09-22: 64.** A piece
  attacks exactly where it can move (spec §2.1), so each non-pawn piece has one portal
  right and the pawn has capture-only. §12's four modes are retired as the default and kept
  as an experimental extension; the 11-slot token format is unchanged and still parses
  every ruleset ever minted. → [`../rules/adjacent-kings.md`](../rules/adjacent-kings.md)
- **[decision, later] Is the slider crossing the right mechanic?** Steppers wrap the file
  (a cylinder); and since 2026-10-03 **sliders wrap the same way**, so with every flag on
  the board *is* a cylinder and file rotation is an 8× symmetry — re-measured in
  [`readiness-probe.md`](./readiness-probe.md) §4. ~~sliders hop at equal rank and lose a
  rank step, so the board is *not* a
  cylinder. Making sliders cylindrical is an alternative **mechanic**, not a flag — the
  kind of change §6 of [`variant-study.md`](./variant-study.md) anticipates if draw rates
  come out too high. Measured in [`readiness-probe.md`](./readiness-probe.md) §4; needs an
  owner decision and a spec section before anyone implements it.

## 6. Relationship to the engine and opponent epics

[`../opponent/`](../opponent/README.md) builds an engine the owner can play against.
It owns the **search and the evaluation**; this epic owns the **throughput, the harness
and the experiment**.

That split turned out to matter more than expected. Measurement showed the existing
generator is fast enough to play a person but not fast enough to run the study, so the
opponent ships first and the perf project is deferred to whoever needs 64,000 games.
The two epics also share the deepest problem — nobody knows what the pieces are worth
in this variant — which [`../engine/evaluation.md`](../engine/evaluation.md) §5
addresses head-on, including the circularity between "unbiased study" and "engine
tuned for the variant".
