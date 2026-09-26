# Story — Self-play harness

> **Status: BACKLOG — unblocked by measurement (2026-09-22), but gated on evaluation.**
> Part of the [balance epic](./README.md). Depends on
> [`rule-flags.md`](./rule-flags.md) and on
> [`../engine/evaluation.md`](../engine/evaluation.md) — **not** on
> [`search-engine.md`](./search-engine.md), which moved after the screen once the cost was
> measured ([`readiness-probe.md`](./readiness-probe.md) §2).

> **Do not run this harness until evaluation discriminates quiet positions.** Measured
> 2026-09-22: **18 of 18** self-play games ended in a repetition draw because the engine
> scores every quiet move identically. The harness would run perfectly and produce a 100%
> draw rate for every ruleset. → [`readiness-probe.md`](./readiness-probe.md) §1

## Summary

As the owner, I want to run many engine-vs-engine games under a given ruleset and
record what happened, so that variants can be compared on evidence.

## 1. One rule per game

Both players must play the **same** ruleset — a game where White may portal a knight
and Black may not is a different game, not a comparison. Variants are therefore
compared on their **metrics**, never head-to-head. This is the design constraint that
shapes the whole harness: it runs *N* games *within* a ruleset, and the study compares
summaries across rulesets.

## 2. What to record

Per game: ruleset, result, ply count, termination reason (mate / stalemate /
repetition / move limit / 50-move), engine budget, seed, and the move list.

Per ruleset, aggregated:

| Metric | Why it matters |
| --- | --- |
| **White score** (win = 1, draw = 0.5) | The first-move advantage. Far from 0.5 means the variant is lopsided. |
| **Draw rate** | Too high → sterile; too low → chaotic. Read together with score. |
| **Decisive rate by termination** | Distinguishes "drawn by repetition after real play" from "hit the move limit". |
| **Mean / median game length** | Very short games suggest a forced tactic; very long suggest neither side can make progress. |
| **Portal move share** | How often the new mechanic is actually *used*. A flag that changes nothing is not a variant. |
| **Branching factor** | Proxy for richness; also tells us how much the portal opens the tree. |
| **Material at termination** | Hints at how piece values shifted. |

**Portal move share deserves emphasis.** If enabling a flag barely changes play, that
is a finding — it means the mechanic is not pulling its weight for that piece, which
is as useful to know as an imbalance.

## 3. Reproducibility

- Every game is seeded; a run is fully reproducible from `(ruleset, seed, budget)`.
- Results are written as newline-delimited JSON — appendable, streamable, diffable.
- Colour assignment alternates, and openings are drawn from a shared randomised book
  or by playing *n* random opening plies, so games are not all identical. **Record the
  opening scheme**: measured balance is conditional on it.
- The harness runs headless via a script (`npm run selfplay`), not in the browser.

### 3.1 Two traps, both paid for already

**Advance games with `reduceMove`, never `advancePosition`.** `advancePosition` maintains
only what decides move legality — board, turn, castling, en passant — and deliberately
*not* the halfmove clock, repetition history or ply count, because the draw rules must
never reach perft. A game loop built on it never terminates: `gameStatus`'s `maxPlies`
backstop reads `state.plies`, which stays `0` forever. This cost a hung probe on
2026-09-22; it is the documented contract, not a defect.

**"No run can hang" must be tested, not asserted.** The move-limit backstop is the only
guarantee the study cannot stall, and it is exactly the kind of claim that is false for a
year before anyone notices.

### 3.2 Budget: fixed nodes, not fixed time

`SearchOptions` currently offers `maxDepth` and a host-supplied `shouldStop`. A study wants
neither: wall-clock makes results hardware-dependent, and fixed *depth* gives different
rulesets different compute, since the seam widens the tree (~21% more nodes at depth 4).

**Add a node budget to `SearchOptions`** so variants are compared at matched compute. It is
a small, layer-clean change — a counter the search already maintains — and it makes a run
reproducible on any machine.

### 3.3 Antithetic pairs: mirrored positions, not colour-reversed

Copying Fishtest's colour-reversed pairing would make our estimate **worse**: their
estimator cancels opening bias, ours reinforces it, because both our players are the same
engine. Pair each opening with its **file-mirrored twin** instead, so `E[bias] = 0` by
construction — a symmetry no chess study has available and spec §7 guarantees.
→ [`../../research/self-play-statistics.md`](../../research/self-play-statistics.md)

### 3.4 Adjudication is a metric, so it is recorded

Resign and draw adjudication cut long dead games, and the screen needs them. But
adjudication changes draw rate and game length, which are **headline metrics**. So: record
every adjudication setting with the run, and validate the screen's settings against an
unadjudicated subsample before reporting.

### 3.5 The data contract

This is the artifact the Python layer depends on
([`analysis-project.md`](./analysis-project.md)), so it is designed once, up front, and
versioned.

**`games.jsonl`** — one record per game: `schema_version`, `run_id`, `ruleset_token`,
`engine_commit`, `weights_id`, `budget {kind: "nodes"|"depth", value}`, `opening_id`,
`opening_ply`, `mirror_twin_of`, `seed`, `result`, `termination`, `plies`, `moves`,
`portal_moves_by_piece`, `material_at_end`, `mean_branching`, `adjudication`, `wall_ms`.

**`features.parquet`** — one row per *quiet* position retained for tuning: `game_id`,
`ply`, `side_to_move`, `game_result`, and the **feature vector produced by TypeScript**.
Positions from the first ~5 plies, mate scores, and positions where the static evaluation
disagrees with quiescence are dropped — standard Texel hygiene
([`../engine/research/evaluation.md`](../engine/research/evaluation.md)).

## 4. Acceptance Criteria

- [ ] Runs *N* games for a given ruleset, budget and seed, and writes one JSON record
      per game.
- [ ] Identical inputs reproduce identical output, byte for byte.
- [ ] Every game terminates — no run can hang, guaranteed by the move limit.
- [ ] Aggregates the metrics in §2 with **confidence intervals**, not bare means.
- [ ] Games are validated: every move is replayed through `reduceMove` and the
      recorded result is re-derived from the final position.
- [ ] Runs many rulesets in one invocation and is parallelisable across cores.
- [ ] Reports progress and can resume after interruption — these runs take hours.
- [ ] Games are advanced with `reduceMove`, and a test proves the **move-limit backstop
      actually fires** rather than assuming it (§3.1).
- [ ] The budget is **fixed nodes**, so a run reproduces on another machine and rulesets
      are compared at matched compute (§3.2).
- [ ] Openings are emitted in **file-mirrored antithetic pairs**, and the pairing is
      recorded per game (§3.3).
- [ ] Adjudication settings are recorded with every run, and the screen's settings are
      validated against an unadjudicated subsample (§3.4).
- [ ] Output matches the versioned schema in §3.5, and a schema-version mismatch fails
      loudly rather than being parsed optimistically.
- [ ] A smoke run of the **all-off control** produces a plausible chess-like W/D/L before
      any variant is run ([README §4](./README.md)).

## 5. Sample size

Scoring draws as 0.5 keeps the variance low: the standard error of White's score over
*n* games is at most `0.5/√n`. So ~1,000 games per ruleset gives roughly ±1.6% at 95%
confidence — enough to detect the kind of imbalance that matters (a few percentage
points) and cheap enough at 64 rulesets (~64,000 games). Do not report a difference
between two variants without a confidence interval; most differences at *n* = 100 will
be noise.

> **Superseded in part.** That paragraph assumed a 64-cell design and per-cell reporting.
> Research since established that **per-cell precision is unaffordable and unnecessary**:
> a main effect averages over half the design and lands far tighter for free, so the
> headline result is main effects, never a leaderboard
> ([`../../research/self-play-statistics.md`](../../research/self-play-statistics.md)).
> The variance formula above is still right, and still the reason draws are cheap to
> measure: `Var = (1−d)/4`, so a drawish variant costs less than a decisive one.
>
> Current sizing lives in [`variant-study.md`](./variant-study.md) §1: **all 64 cells ×
> 200 games ≈ 12,800 games**, roughly 2 hours on 20 workers at the measured cost
> ([`readiness-probe.md`](./readiness-probe.md) §2). The original paragraph's ~1,000
> games per ruleset is affordable too — ~13 hours — and is the second stage.

## Definition of done

A seeded, resumable, parallel runner that produces validated per-game records and
aggregate metrics with confidence intervals, for any ruleset.
