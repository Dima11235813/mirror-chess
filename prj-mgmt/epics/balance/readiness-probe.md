# Findings — what we measured before building the harness (2026-09-22)

> **Status: DONE (2026-09-22).** Five throwaway probes against the real engine, run before
> planning the self-play work. Two of them changed the plan; one corrected a claim in
> [`../../research/variant-precedent.md`](../../research/variant-precedent.md). The probes
> were deleted, per CLAUDE.md §8 ("probe before you specify") — this file is what they left
> behind.

Everything below is **measured on this machine** (24 logical cores) unless it says
*extrapolated*. Where a number is an estimate, it says so, because the whole point of the
exercise was to stop estimating.

---

## 1. The blocker is evaluation, not throughput

**This is the finding that reorders the epic.** The roadmap put
[`search-engine.md`](./search-engine.md) first, on the reasoning that the study needs
~64,000 games and the engine is slow. That reasoning is sound and the conclusion was still
wrong, because a faster engine would produce more of the *wrong* data.

Measured:

| Probe | Result |
| --- | --- |
| Distinct static scores among the 20 opening moves | **1** (every move scores `0`) |
| The same, with `{ mobility: true }` | **11**, range −3..51 |
| Self-play games ending `draw-repetition` | **18 of 18** (depths 2 and 3; all-off, sliders-only, all-on) |
| Shortest such game | **17 plies** |

A real game log, all flags on, depth 3:

```
b1c3 a7a6 a1b1 a6a5 b1a1 a5a4 a1b1 b7b6 b1a1 c7c6 a1b1 …
```

White's rook oscillates `a1–b1` while Black pushes pawns. The engine is not playing badly;
it is **indifferent**. `evaluate` is material-only by default — mobility was switched off
because it measured 1465× the material term — so every quiet move scores identically, ties
break by generation order, and the game shuffles into a threefold repetition.

Two consequences:

1. **Every cell of the study would report a 100% draw rate.** The control
   ([README §4](./README.md)) would fail, and correctly so: the harness would be measuring
   the evaluation's silence, not the game.
2. **It affects the shipped opponent too.** In a quiet position the engine has no
   preference; against a human it plays aimlessly until something is capturable. The
   roadmap's "wins a rook with a two-move back-rank tactic" and this are the same fact seen
   from two sides: tactics work, positional play does not exist.

### The bootstrap trap in the fix

Texel tuning labels positions by **game result**. A corpus of 100% draws carries no signal,
so tuning cannot be the first step. The order has to be:

```
cheap discriminating term  ->  decisive games  ->  corpus  ->  tuned weights
```

→ owned by [`../engine/evaluation.md`](../engine/evaluation.md), now the epic's first item.

---

## 2. What the study costs, in hours rather than adjectives

Per-move search cost from the opening position (ms), by depth and ruleset:

| Depth | all-off (chess) | sliders only | all-on |
| --- | --- | --- | --- |
| 2 | 16 | 13 | 11 |
| 3 | 17 | 15 | 14 |
| 4 | 60 | 133 | 143 |
| 5 | 243 | 467 | 500 |

In real (if degenerate) games the midgame cost at depth 3 ran **28–347 ms/move**, averaging
around 100 ms; each additional ply costs roughly **3.4×**.

Budget, at ~12 s per game at depth 3 (*estimated*: 100 ms/move × ~120 plies — today's games
are shorter only because they are degenerate, so treat it as a lower bound):

| Stage | Games | 20 workers |
| --- | --- | --- |
| Screen — all 64 cells × 200 | 12,800 | **~2 h** |
| Deepen — all 64 cells × 1,200 | 76,800 | ~13 h |
| Confirm — 8 cells × 4,000 at depth 6 | 32,000 | **~2.7 days** *(extrapolated)* |

*(These are the figures for the **64-cell** space settled later the same day — §3. The
run they were first computed for, a 128-cell screen of a 2,048-cell space, came to ~4.5 h,
so the conclusion is unchanged either way: **screening is affordable today**.)*

**Screening is affordable on today's engine.** The earlier "weeks" figure assumed 1 s/move
and a single core; fixed shallow depth plus 24 cores is a different problem.

Throughput binds at the **confirmation** stage, which finally gives
[`search-engine.md`](./search-engine.md) the target its own acceptance criteria demand
("derived from the actual run budget rather than picked arbitrarily"):

> **5–10×**, enough to bring a 16-cell confirmation run under a day.

---

## 3. The king's flags: the pathology is real, and not the one we argued about

[`../../research/variant-precedent.md`](../../research/variant-precedent.md) predicted that
differing king flags make adjacency **non-symmetric** — "king A attacks king B across the
seam but not vice versa" — then rejected its own prediction on 2026-08-03, reasoning that
both kings share one static ruleset so "checkmate keeps its ordinary meaning". Measured,
with `K` quiet on and capture off:

| Position | `a1` attacked by black K | `h1` attacked by white K | White `Kb1` may play |
| --- | --- | --- | --- |
| `w:Kb1; b:Kh1`, K quiet only | **false** | **false** | `a1`, a2, b2, c1, c2 |
| the same, K quiet + capture | true | true | b2, c1, c2 (not `a1`) |

**Both sides play one ruleset** ([`self-play-harness.md`](./self-play-harness.md) §1), so
the rights are symmetric by construction — the August rebuttal was right about that, and
wrong about what follows from it. The pathology is *mutual non-attack*: the two kings may
simply stand side by side across the seam, and checkmate stops being equivalent to "could
capture the king next move". **Symmetric non-attack is still the Ultima outcome.**

The position remains formally well-posed — mate is still "attacked, with no legal move" —
so it is a **strange game, not a broken one**, and the first decision that day (keep all
2,048 rulesets and measure them) was taken on that basis.

**The owner then overruled it, on better grounds, the same day.** The governing principle
is that *the movement space expands while the rules stay the same* (spec §2.1), and a king
that can **step** to a square **controls** that square. A king crossing without attacking
therefore breaks the oldest rule in the game — a king may not move into check — and breaks
it invisibly, because the square looks safe to the move generator. The objection
generalises to every non-pawn piece, so §12's split is retired as the default and the space
is **six flags, 64 rulesets**. → [`../rules/adjacent-kings.md`](../rules/adjacent-kings.md)

The measurement stands; what changed is what it means. It was read first as *an odd but
legal variant worth measuring*, then as *evidence that the rule was wrong*. Both readings
came from the same table above, which is worth remembering the next time a measurement
looks like it settles something.

---

## 4. With every flag on, the board **is** a cylinder — re-measured 2026-10-03

> **Reversed by the crossing revision.** This section used to read "the board is not a
> cylinder — except for the steppers", and the `[decision]` it flagged at the end — *should
> the slider crossing be cylindrical?* — has since been **taken**, by the owner, for a
> different reason: a diagonal must continue as a diagonal
> ([`../rules/diagonal-crossing.md`](../rules/diagonal-crossing.md)). The old measurements
> are kept below the new ones, because the *contrast* is the useful part.

Checked because it is worth a lot: 8-fold file-rotation symmetry shrinks any tablebase
eightfold and constrains a learned evaluation. Rotating **every** file by `k` and comparing
legal-move sets, 60 random placements per row:

| Material | all-on | sliders only | all-off (chess) |
| --- | --- | --- | --- |
| kings + knights | **holds, k = 1..7** | breaks | breaks |
| kings + knights + pawns | **holds, k = 1..7** | breaks | breaks |
| king + bishop vs king + pawn | **holds, k = 1..7** | breaks | breaks |
| king + rook vs king + pawn | **holds, k = 1..7** | breaks | breaks |
| king + queen vs king + pawn | **holds, k = 1..7** | breaks | breaks |
| full material, both sides | **holds, k = 1..7** | breaks | breaks |
| *file mirror, for comparison* | holds | holds | holds |

**Under the all-on ruleset there is now one crossing and it is a file wrap** (spec §4 and
§11 are the same rule), so every piece sees a board whose files are a cycle. Rotation is a
symmetry of the whole move generator, not just of the steppers. It breaks under *mixed*
rulesets exactly as it should: if some pieces wrap and others do not, the a/h files are
distinguishable, and the generator can tell them apart.

> **What it used to say, and why.** "Steppers wrap the file (§11), which is cylinder
> adjacency. **Sliders hop at equal rank** (§4) — and §4 explicitly calls the cylinder wrap
> wrong: a bishop leaving `a4` emerges at `h4`, not `h5`, losing a rank step the cylinder
> would keep." Measured, correct, and now false: `h5` is the answer, and the rank step the
> cylinder keeps is exactly what a continuing diagonal needs.

Consequences, and the first is the valuable one:

- **Symmetry reduction is 8× for the all-on ruleset**, for any material — not 2×, and not
  only for stepper-only endings. That applies to a tablebase, to a transposition table's
  position class, and to anything learned.
- **A piece-square table under all-on may depend on rank only.** Any file-dependent term
  is *provably* wrong there, by symmetry, and no amount of self-play will teach it a
  correct one. This is a hard constraint on
  [`../engine/evaluation.md`](../engine/evaluation.md) rather than a hypothesis to test —
  and it is stronger than the old "piece-square tables are near-meaningless", which was an
  observation about the edge not being a wall.
- **It holds per ruleset, not in general.** The study covers 64 rulesets; only those where
  every piece crosses are rotation-symmetric. An optimisation keyed on this must be keyed
  on the ruleset too, which is precisely the transposition-table trap
  `epics/engine/research/` predicted.
- **Caveat: castling is the one file-absolute rule** (spec §13.3 — `e1`, `a1`, `h1` are
  named squares). These measurements use analysis positions, so expect the symmetry to hold
  only once both sides' castling rights are gone. Worth checking before anything is keyed
  on it.

---

## 5. A trap for whoever writes the harness

The first probe hung, and the reason is worth passing on: it advanced games with
`advancePosition`, which **deliberately** maintains only what decides move legality — board,
turn, castling, en passant — and *not* the halfmove clock, repetition history or ply count.
So `gameStatus`'s `maxPlies` backstop never fires and the loop runs forever.

That is the documented contract (the omission is what keeps the draw rules out of perft),
not a defect. But it is exactly the mistake a harness author makes at speed:

- The harness must advance games with **`reduceMove`**.
- [`self-play-harness.md`](./self-play-harness.md) gains an acceptance criterion that the
  move-limit backstop **actually fires**, with a test that proves it — "no run can hang" is
  otherwise an untested claim.

---

## 6. What this file changed

| Document | Change |
| --- | --- |
| [`README.md`](./README.md) | Order of work: evaluation first, throughput after the screen |
| [`../engine/evaluation.md`](../engine/evaluation.md) | The indifference measurement, and it becomes the epic's first item |
| [`self-play-harness.md`](./self-play-harness.md) | Data contract, `reduceMove`, backstop test, adjudication |
| [`search-engine.md`](./search-engine.md) | A derived target (5–10×) and a later slot |
| [`variant-study.md`](./variant-study.md) | 64 cells, full factorial; staged protocol |
| [`../rules/mirror-portal-spec.md`](../rules/mirror-portal-spec.md) | §2.1 the governing principle; §8.5 notation adopted; §12 retired as the default |
| [`analysis-project.md`](./analysis-project.md) | New — the Python analysis and tuning layer |
| [`../rules/adjacent-kings.md`](../rules/adjacent-kings.md) | New — semantics the spec never stated |
