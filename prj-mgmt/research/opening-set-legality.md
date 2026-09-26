# Finding — can one opening set serve every variant?

> Measured against our own engine on 2026-08-03, answering the check that
> [`self-play-statistics.md`](./self-play-statistics.md) flagged as *"worth more than any
> amount of extra compute"*. Not literature — a measurement.

## The question

If standard-chess opening lines are legal under every ruleset, one universal opening set
works, and every between-variant comparison becomes **paired** via common random numbers
— the single biggest variance lever available to the study.

It is not automatic. Enabling a flag adds *pseudo-legal* moves, but it also hands the
opponent new attacks, so a move that was legal can become **illegal by self-check**.

## The answer: no — and it starts at ply 3

Walking the standard-chess tree and asking, at every node, whether each standard-legal
move survives under the mirror rulesets:

| Depth | Moves lost | Nodes affected |
| --- | --- | --- |
| 1 | 0 / 20 (0%) | 0% |
| 2 | 0 / 420 (0%) | 0% |
| 3 | 12 / 9,322 (**0.129%**) | **2.85%** |
| 4 | 602 / 206,603 (0.291%) | 4.53% |
| 5 | 25,915 / 5,071,954 (**0.511%**) | **6.96%** |

The rate grows steadily. By ply 5, **~7% of positions contain at least one move that is
legal in chess and illegal under mirror rules.**

### The mechanism, worked

The earliest case is `1. d3 b6 2. Ke1-d2?` — legal in chess, illegal here. The engine's
own `checkPath` explains why:

```
c8 → b7 → a6 → [seam] → h6 → g5 → f4 → e3 → d2
```

Black's **queen's bishop, still on its home square**, checks a king on `d2` by leaving
the board on the a-file and returning along the far side. `b7-b6` was the move that
opened the path. This is a fine advertisement for the variant and a serious problem for
naive study design.

### Steppers contribute nothing here

`BRQ---` and `BRQNKP` produce **identical numbers at every depth**. Every early
divergence is caused by a **slider** crossing; the stepper flags contribute none of it in
the first five plies. That is consistent with steppers only wrapping at the edge files,
where nothing dangerous is happening in the opening — and it is a small piece of evidence
that the `BRQ---` engine baseline exercises the tactically important crossing.

## What this costs the study

**The universal opening set does not work as-is.** Three options, none free:

| Option | Gains | Costs |
| --- | --- | --- |
| **Openings ≤ 2 plies** | Provably legal under every ruleset (measured: 0 divergence). 420 positions, 840 with mirrored twins. Full common random numbers. | Low diversity — games will be highly correlated |
| **6–8 ply book, filtered** | Good diversity, and filtering is cheap (replay each line under every ruleset, discard failures) | **Selection bias**: excluding lines where the seam creates early tactics systematically biases *toward* positions where the mechanic is inactive — understating exactly what we are trying to measure |
| **Per-variant books** | No bias, full diversity | **Loses common random numbers**, which was the point |

The filtering bias is the subtle one and deserves emphasis: a book chosen because every
line is legal in all 1,024 variants is, by construction, a book that avoids early seam
activity.

**Recommendation to consider, not a decision:** use the 2-ply universal set for the
*screening* stage, where common random numbers matter most and per-cell precision does
not, and switch to per-variant books for the deep confirmation stage on a handful of
survivors, where bias matters more than variance. Record whichever is used next to every
number, per the reporting rules.

## Reusable by-product

The measurement is a **property test worth keeping**: "under any two rulesets `A ⊆ B`,
the set of legal moves is not monotone" is a genuine, counter-intuitive property of this
game, and encoding the `1. d3 b6 2. Kd2` case as a regression test documents it far
better than prose.
