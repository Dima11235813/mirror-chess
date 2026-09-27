# Story — The variant study

> **Status: BACKLOG — design settled (2026-09-22), blocked on evaluation then the harness.**
> Part of the [balance epic](./README.md). The experiment itself. Depends on
> everything else in the epic.

## Summary

As the owner, I want to run the rule-flag space through self-play and read off which
pieces should cross the seam by default, so that Mirror Chess's default rules are
chosen from evidence.

## 1. Design: a `2^6` full factorial, and this time the space is settled

> **The flag count moved twice in one day (2026-09-22) — the record matters more than the
> number.** Spec §12 had split each piece's portal into two rights, so the code carries 11
> token slots and the space looked like **2,048** cells, screened by a 128-run
> resolution-V fraction. The owner then established the governing principle (spec §2.1):
> *the movement space expands, the rules stay the same*, so a piece attacks exactly where
> it can move. That retires the split, and the space returns to **six flags, 64 rulesets**
> — where this story started. → [`../rules/adjacent-kings.md`](../rules/adjacent-kings.md)

Six flags (`B R Q N K` crossing both ways, `P` capturing across) → **64 rulesets**, a
complete `2^6` factorial. All 64 fit in the budget, so nothing is aliased and no fractional
design is needed: every main effect and **all 15 two-way interactions** are estimable, with
`1 + 6 + 15 = 22` parameters over 64 cells.

- **Main effect** of each piece's portal on White's score, draw rate and game length —
  averaged over the 32 rulesets where it is on versus the 32 where it is off.
- **Interactions** — whether enabling `K` matters more when `Q` is also on.

**Precision, at the measured cost** (σ = ½√(1−d), so draws make a cell cheaper):

| Games/cell | Total | 20 workers | Per cell | Main effect | Interaction |
| --- | --- | --- | --- | --- | --- |
| 200 | 12,800 | ~2 h | ±4.9 pp | **±1.2 pp** | ±2.5 pp |
| 1,200 | 76,800 | ~13 h | ±2.0 pp | **±0.5 pp** | ±1.0 pp |

A main effect averages over 32 cells per side, so it lands ~4× tighter than any single
cell — which is the whole reason the factorial framing is affordable. Report main effects
first; the ranking is a consequence, not the finding, and the argmax of 64 noisy cells is
optimistically biased (the winner's curse).

## 2. Protocol

Staged, because estimating and selecting on the same data is how a study fools itself.
Costs are at the measured per-game rate, on 20 workers
([`readiness-probe.md`](./readiness-probe.md) §2).

| Stage | What | Games | Cost | What it decides |
| --- | --- | --- | --- | --- |
| **0 — Control** | All-off is ordinary chess: check White scores modestly above 50% and the draw rate rises with budget. **If the control looks wrong, stop** ([README §4](./README.md)) | ~6k | ~1 h | The harness is unbiased; fixes book, budget and pairing |
| **1 — Screen** | All 64 cells × 200 games | 12,800 | **~2 h** | Every main effect (±1.2 pp) and all 15 interactions, with Benjamini–Hochberg across the 21 contrasts |
| **2 — Deepen** | All 64 cells × 1,200 games | 76,800 | ~13 h | Main effects at ±0.5 pp; the full landscape, since 64 cells is affordable outright |
| **3 — Confirm** | The shortlist (~8 cells) × 4,000 games on a **fresh** sample, at a much higher budget | 32,000 | **~2.7 days** *(extrapolated; what the throughput work targets)* | Estimates with intervals that survive stronger play |

**A surrogate model and a racing stage are no longer needed.** Both existed to avoid
measuring thousands of cells; at 64 the full grid is cheaper than the machinery that would
have approximated it. If the space ever reopens — §12's modes returning as a study axis —
[`../../research/experimental-design.md`](../../research/experimental-design.md) has the
design ready.

Then, and only then:

5. **Shortlist, do not crown.** The argmax of noisy estimates is optimistically biased —
   the winner's curse — so every shortlisted cell is re-estimated on fresh games. Balance
   measured at weak play frequently does not survive stronger play; that is the single most
   likely way this study misleads us.
6. The owner **plays** the shortlist. "Strategically rich" is not in the metrics, and every
   serious study in this field ends in human judgement
   ([`../../research/game-quality-and-fun.md`](../../research/game-quality-and-fun.md)).

## 3. Selection criteria

Ranked, applied in order:

1. **Not lopsided.** White's score close to 0.5. A variant where the first move is
   worth a large edge is disqualified regardless of how interesting it is.
2. **Decisive at reachable strength.** Draw rate low enough that games are worth
   playing, with draws arriving by repetition after real play rather than by move
   limit.
3. **The mechanic is used.** A meaningful portal-move share. A flag that changes
   nothing should be off — simpler rules win ties.
4. **Rich.** Healthy branching factor, varied game lengths, no single dominant motif.
5. **Explainable.** Between two similar candidates, prefer the one whose rules are
   easier to teach. "Every piece crosses" and "only sliders cross" are both easy to
   state; "everything except the king and the b-pawn" is not.

## 4. Threats to validity — write these into the report

- **Engine strength.** Results describe play at the budget tested. Mitigated by step 5,
  not eliminated.
- **Evaluation bias.** A hand-tuned evaluation embeds piece values that are wrong for
  these variants; mobility weighting mitigates this but does not remove it
  ([`search-engine.md`](./search-engine.md) §3).
- **Opening scheme.** Balance is conditional on how games start. Record it.
- **Missing rules.** If promotion, castling or en passant are absent, the study
  measures a different game. This is why they block the epic.
- **Multiple comparisons.** Across 64 rulesets some will look extreme by chance.
  Main effects are far more robust than any single ruleset's score; treat the ranking
  accordingly.

## 5. Acceptance Criteria

- [ ] The control (all flags off) reproduces known chess behaviour, and this is
      checked before anything else is reported.
- [ ] All 64 rulesets are run at a documented budget, with confidence intervals.
- [ ] Main effects and all 15 two-way interactions are computed and reported.
- [ ] Every metric is reported as a **curve over engine budget**, never a scalar: measured
      imbalance roughly halved across two steps of compute in DeepMind's chess study, so a
      single-budget number describes the engine, not the game.
- [ ] No estimate is published from the same games that selected it.
- [ ] A shortlist is re-run at a higher budget, and any conclusions that did not
      survive are stated explicitly.
- [ ] A written report records the protocol, the numbers, and §4's threats.
- [ ] The report is reproducible from committed seeds and scripts.
- [ ] A recommendation for the default ruleset, with its reasoning — and the owner's
      decision recorded in the spec, since changing the default changes §2 of
      [`mirror-portal-spec.md`](../rules/mirror-portal-spec.md).

## 6. Possible outcomes worth planning for

- **The current all-on default is fine.** Then the study cost us compute and bought
  confidence. That is a good outcome, not a wasted one.
- **One piece is the problem.** The likely candidate is the **king**: it is the piece
  whose portal most changes mate patterns, and it already dissolved three of our mating
  positions ([`../rules/stepper-portal.md`](../rules/stepper-portal.md)). A variant
  where every piece crosses *except* the king is the obvious hypothesis to test.
- **Draw rates are very high everywhere.** A board with no edges may simply make kings
  too hard to trap. If so, the interesting question moves from *which pieces cross* to
  *whether the seam should be harder to use* — a different mechanic, and a new spec
  section rather than a flag.

## Definition of done

Every ruleset measured, main effects reported, the control validated, a shortlist
played by the owner, and a recommendation the spec can adopt.
