# Story — An engine that plays well, and spends the time it is given

> **Status: NEXT — the owner's blocker (2026-09-22).** Part of the
> [engine epic](./README.md). Sits directly on top of
> [`evaluation.md`](./evaluation.md), which is what makes "plays well" possible at all, and
> takes the search items from [`engine-core.md`](./engine-core.md)'s whitelist.

## Summary

As the owner, I want the engine to play the best move it can find in the time I give it, so
that I can set a rule permutation, play against it, and trust that what I am judging is the
game rather than a half-built engine.

## 1. It does not currently use its time — measured

`DIFFICULTIES` gives each level a `maxDepth` **and** a `budgetMs`, and `levels.ts` says so
plainly: *"Budgets are set just above the depth each level targets, so the ceiling normally
binds and the clock is a backstop."*

That is backwards for the owner's purpose. On a fast machine "Sharp" stops at depth 6 and
hands back the rest of its six seconds; on a slow one it is cut off mid-iteration and
discards the partial result. Either way, **the time given is not the time used**.

The fix is ordinary engine practice and needs the pieces below in order.

### 1.1 Time management

- Iterative deepening runs until the budget is nearly spent, with **no depth ceiling** in
  normal play. Depth stays available as a separate, reproducible budget for self-play.
- **Predict before starting an iteration.** Each ply costs roughly 3.4× the last (measured,
  [`../balance/readiness-probe.md`](../balance/readiness-probe.md) §2); if the estimate
  does not fit the remaining budget, stop rather than start work that will be thrown away.
- Keep the **last completed iteration** as the answer — already the rule, and it is why a
  discarded partial iteration is pure waste.
- A **safety margin** so the move is returned before the budget, not after it.

### 1.2 Search strength, from the whitelist

In the order they pay, each keeping `alpha-beta ≡ negamax`:

| | Buys |
| --- | --- |
| **Transposition table** (with the ruleset-salting trap) | The largest single node reduction; also makes iterative deepening cheaper by seeding move ordering |
| **Killers + history** | Better ordering, which is most of alpha-beta's value |
| **Aspiration windows** | Narrower re-searches between iterations |
| **PVS** | Cheaper verification of non-PV moves |
| **SEE, for ordering only** | Stops losing captures being searched first — seam-aware, since a capture may arrive across the seam |

**The quiescence explosion is the specific enemy here**: 80–94% of all nodes, and the seam
roughly triples the tree. Delta pruning and SEE-based cutoffs in quiescence may buy more
than anything in the table above; measure before choosing.

## 2. What "plays well" means, testably

"Good moves" is a judgement, so it is bounded by measurements that are not:

- [ ] **It uses its budget.** Given 1 s, 5 s and 30 s on the same position, it reaches
      strictly greater depth and returns within the budget every time.
- [ ] **Each version beats the last.** A new search feature must win a match against the
      previous build under the same ruleset, judged by **SPRT**, not by a single game or a
      node count. A feature that does not win is reverted, however clever.
- [ ] **Each difficulty beats the one below it**, measured rather than asserted — the open
      criterion in [`../opponent/opponent-integration.md`](../opponent/opponent-integration.md).
- [ ] **It finds the seam.** On a suite of positions where a portal move is clearly best, it
      plays it — including the king-and-bishop mate that exists only because of the seam.
- [ ] **It does not shuffle.** No repetition draw arises from indifference in a position
      with obvious progress available ([`evaluation.md`](./evaluation.md) §0).
- [ ] **Determinism holds** at a fixed node budget: same position, same ruleset, same
      answer, on any machine.
- [ ] **Mate scores stay exact**: mate-in-N found at depth `2N−1`, scoring exactly
      `MATE−(2N−1)`, which is the classic `Depth`/`Ply` confusion wearing a disguise.

## 3. The validation loop the owner actually wants

Measurements bound it; the owner judges it. That needs the GUI work — a rules picker, a
visible move log, and the engine's own view of what it is thinking — so that a bad move can
be *seen* and then reduced to a position and a depth:

→ [`../board-interactions/rules-picker.md`](../board-interactions/rules-picker.md)
→ [`../board-interactions/history/move-log.md`](../board-interactions/history/move-log.md)

**The engine's output is evidence, not decoration.** Depth reached, score, node count and
the principal variation belong on screen, because "it played something strange" is
unfalsifiable and "it played this at depth 6 expecting this line" is a bug report.

## 4. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/engine/search.test.ts` | equivalence twins, mate scores, determinism, PV legality |
| Unit | `src/engine/time.test.ts` | budget respected; deeper with more time; no iteration started that cannot finish |
| Bench | `src/engine/bench.ts` | nodes/second and depth-in-budget per ruleset, tracked so a regression is visible |
| Match | `scripts/engine-match.ts` | version vs version under SPRT; level vs level |

## Definition of done

The engine spends the time it is given, each added technique is proved to win a match
rather than merely to run, and the owner can sit down at a chosen ruleset and form a
judgement about the moves — with the engine's reasoning visible enough to file a bug.
