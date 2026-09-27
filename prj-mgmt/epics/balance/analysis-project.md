# Story — The analysis project (Python)

> **Status: BACKLOG — approved in principle (2026-09-22), blocked on the harness emitting
> data.** Part of the [balance epic](./README.md). Consumes
> [`self-play-harness.md`](./self-play-harness.md); feeds
> [`../engine/evaluation.md`](../engine/evaluation.md).

## Summary

As the owner, I want the statistics and the weight-fitting to live in a small Python
project, so that the factorial analysis, the confidence intervals and the Texel tuning are
done with the tools the field actually uses rather than re-implemented badly in TypeScript.

## 1. The boundary that makes this safe

The repo's founding lesson is that two implementations of one rule drift apart. A Python
project that parsed positions would be a second move generator by another name.

> **Feature extraction stays in TypeScript. Python never sees a board.**

The harness emits **feature vectors and outcomes**; Python fits weights and computes
statistics; TypeScript consumes `weights.json`. Python cannot drift from the rules because
it never implements them. This is [ADR 0002](../engine/adr/0002-two-implementations-one-oracle.md)'s
habit applied across a language boundary — with the twist that here the second
implementation is **prevented** rather than tested.

```
   TypeScript                          Python
   ──────────                          ──────
   rules, search, features   ──────>   games.jsonl / features.parquet
                                           │
   evaluate(dot(w))          <──────   weights.json
                                           │
   (nothing)                 <──────   report.md + figures
```

**The one test that guards the seam:** a fixture of positions with their TS feature vectors
and TS scores; Python recomputes the score from the same vectors and weights; the two must
agree to the centipawn. A mismatch means the dot product disagrees, which is the only thing
both sides implement.

## 2. What it does

| Module | Job |
| --- | --- |
| `io.py` | Read `games.jsonl` / `features.parquet`; validate the schema; fail loudly on a version mismatch |
| `metrics.py` | W/D/L, White score, draw rate, game length, termination mix, portal-move share — each with a **Wilson interval**, never a bare mean |
| `factorial.py` | Main effects and all 15 two-way interactions over the 6 flags; Benjamini–Hochberg across the 21 contrasts; paired contrasts against the all-off control |
| `tuning.py` | Texel: fit `K` first, then gradient descent on the feature weights; emit `weights.json` |
| `skilltrace.py` | Strength ladder — win rate of deeper search against shallower, per ruleset, as a skill-sensitivity proxy |
| `report.py` | Render markdown + figures into `prj-mgmt/epics/balance/results/` |

## 3. Stack and conventions

- **uv**, already installed on this machine for Serena — including the
  `UV_NATIVE_TLS=1` workaround this network needs (CLAUDE.md §9).
- `polars` + `pyarrow` for the data, `numpy`/`scipy`/`statsmodels` for the statistics,
  `matplotlib` for figures, `typer` for the CLI. (`scikit-learn` only if the flag space
  ever reopens and a surrogate model is needed again — at 64 cells the full grid is
  measured, so there is nothing to interpolate.)
- `pytest`, and the suite includes a **synthetic-data test**: generate games from a known
  main effect and confirm the analysis recovers it inside its stated interval. An analysis
  pipeline nobody has tested on data with a known answer is an opinion.
- Lives in `analysis/`, entirely outside the TypeScript build. No npm dependency, no CI
  coupling beyond reading the harness's output files.

## 4. The calibration that makes the tuning trustworthy

Tune the **all-off control first** and check the pipeline recovers roughly classical chess
values (`P≈1, N≈3, B≈3, R≈5, Q≈9`). All flags off *is* chess, so the answer is known from
outside the project — the same trick [README §4](./README.md) uses for the harness, applied
to the learner.

> **If the control's values come out wrong, no variant's values are reportable.**

Then the number everyone actually wants: what a **seam-crossing bishop** is worth. The
current `PIECE_VALUES` comment predicts it moves most, and it is labelled *inherited from
chess, probably wrong here* — so a labelled wrong number becomes a measured one.

## 5. Acceptance Criteria

- [ ] `analysis/` exists as a uv project, with `pytest` passing and a documented one-command
      setup that works behind this network's TLS interception.
- [ ] Reads the harness's output and reproduces its per-ruleset metrics with intervals.
- [ ] Computes main effects and all 15 two-way interactions for the 6 flags, with BH
      correction across the 21 contrasts.
- [ ] The synthetic-data test recovers a planted main effect within its interval.
- [ ] `tuning.py` emits a `weights.json` that the TypeScript engine loads unchanged.
- [ ] The cross-language agreement test in §1 passes.
- [ ] The control recovers classical piece values before any variant's values are published.
- [ ] No cell is *predicted*: all 64 are measured, so the analysis reports what was played
      rather than a model's guess. (If the space reopens,
      [`../../research/experimental-design.md`](../../research/experimental-design.md) has
      the surrogate design and its held-out R² gate.)
- [ ] Every figure and table is reproducible from committed seeds and a single command.

## 6. Explicitly not in scope

1. **No game rules in Python** — no move generation, no legality, no board parsing.
2. **No engine** — Python never plays a game; it reads what the harness played.
3. **No neural evaluation** yet. Deferred with a trigger:
   [`../engine/evaluation.md`](../engine/evaluation.md) §7.
4. No notebooks as deliverables. A notebook may explore; a script produces the report.

## Definition of done

A small, tested Python project that turns the harness's output into the study's numbers and
the engine's weights, and that cannot drift from the rules because it never implements them.
