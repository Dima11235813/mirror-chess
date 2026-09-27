# Story — Making the engine fast enough for the study

> **Status: BACKLOG — deferred behind the screen, and now with a derived target
> (2026-09-22).** Measurement moved this story twice: first off the opponent's critical
> path, now off the *screen's*. The screen costs ~4.5 h on 20 workers at today's speed.
> Throughput binds at the study's **confirmation** stage, and that fixes the number this
> story was missing:
>
> > **Target: 5–10×**, enough to bring a 16-cell × 4,000-game confirmation run at a strong
> > budget under a day (currently ~5.4 days, extrapolated).
>
> → [`readiness-probe.md`](./readiness-probe.md) §2

> Part of the [balance epic](./README.md). Depends on
> [`../rules/draw-rules.md`](../rules/draw-rules.md) and on promotion (spec §8.4).
>
> **The search itself now lives in
> [`../engine/engine-core.md`](../engine/engine-core.md)** and
> [`../engine/evaluation.md`](../engine/evaluation.md). This story is what the
> *study* needs on top: throughput.

## Summary

As the owner, I want the engine fast enough to play tens of thousands of games, so that
the variant study finishes in hours rather than weeks.

## 1. Why this is a separate story from the opponent

Measured on 2026-07-31 ([opponent README §1.1](../opponent/README.md)): the current
generator does ~250k positions/second, which is **ample for a one-second opponent move**
but not for the study's ~64,000 games.

The gap is arithmetic. At 64 rulesets × 1,000 games × ~80 plies × a ~1s search, a naive
run is measured in weeks. The study needs either a much faster engine, a much smaller
per-move budget, or both — and a smaller budget weakens the conclusions
([`variant-study.md`](./variant-study.md) §4). So: make it fast.

The current generator is correct but pays heavily for it. Every legality check
allocates a new 64-entry board and then scans all 64 squares generating full attack
sets (`isInCheck` → `isSquareAttacked` → `attacksFrom` per piece), so generating one
position's legal moves is roughly O(moves × 64 × ray-length) with an allocation per
move.

This is not a criticism of that code — it was written to be obviously correct against
the spec, which is exactly right for a rules oracle. **Keep it.** It becomes the
reference implementation the fast path is differentially tested against.

## 2. Performance work (prerequisite)

- [ ] **Attack lookups instead of full generation.** To test "is square `s` attacked
      by `c`", walk outward *from `s`* and ask what sits there, rather than generating
      every piece's attacks. Both crossings complicate this — the portal means a
      square can be attacked from a ray that leaves the board — so derive it from the
      spec, not by analogy with ordinary chess.
- [ ] **Make/unmake instead of copy.** Mutate a board and undo, rather than
      `board.slice()` per move. This is the one place the "no mutation" rule earns an
      explicit, documented exception, confined to the search.
- [ ] **Typed arrays** (`Int8Array`) for the board.
- [ ] **Incremental check detection** — a move can only expose the king along one line.
- [ ] Benchmark harness reporting nodes/second, run in CI so regressions are visible.

**Correctness gate:** the fast generator must agree with the reference generator on
perft to depth 4+ from a suite of positions, for **every** ruleset. A differential
test, not a hand-written expectation list.

## 3. Which evaluation the study uses

Settled in [`../engine/evaluation.md`](../engine/evaluation.md) §5: the study
screens with the **Stage A geometry-free evaluation** (material + mobility, no
piece-square tables), because it asserts almost nothing and is therefore the least
biased thing available. It shortlists; the shortlist is then re-run with values derived
per ruleset.

That story also documents the circularity — an unbiased study wants per-variant piece
values, and deriving those needs an engine — and the one round of iteration that
resolves it. Read it before running anything.

## 4. Acceptance Criteria

- [ ] Perft agreement with the reference generator to depth 4+ for all six flags on,
      all off, and a sample of mixed rulesets — a differential test, not hand-written
      expectations.
- [ ] A measured speedup large enough to make the study tractable, with the target
      derived from the actual run budget rather than picked arbitrarily. **Derived
      2026-09-22: 5–10×** (see the status banner). Cheaper wins come first and may get
      most of the way there on their own — a transposition table, killers/history, and
      pruning the quiescence explosion that is 80–94% of all nodes — before the board
      representation is touched.
- [ ] Nodes/second benchmarked per ruleset and tracked in CI.
- [ ] The mutation used by make/unmake is confined to the search and documented as the
      deliberate exception to the purity rule (CLAUDE.md §2).
- [ ] The reference generator remains in use as the oracle and is never deleted.

## 5. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/engine/perft.test.ts` | differential perft, fast vs reference, several rulesets |
| Bench | `src/engine/bench.ts` | nodes/second per ruleset, tracked over time |

Search correctness is covered by
[`../engine/engine-core.md`](../engine/engine-core.md); this story only has to
prove the fast path generates the same moves as the slow one.

## Definition of done

Move generation fast enough that 64 rulesets × ~1,000 games is a run measured in hours,
proven equivalent to the reference generator by differential perft across rulesets.
