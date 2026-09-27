# Engine research digests

Findings from a research fan-out run on **2026-08-02**, before writing the core engine
plan. Five parallel streams surveyed authoritative chess-engine practice and assessed
what transfers to a variant with a configurable mirror seam.

These are **inputs to the plan, not the plan**. The synthesis lives in
[`../engine-core.md`](../engine-core.md) and the decisions in [`../adr/`](../adr/).

| Stream | Digest |
| --- | --- |
| Board representation & move generation | [`board-and-movegen.md`](./board-and-movegen.md) |
| Evaluation architecture | [`evaluation.md`](./evaluation.md) |
| Search architecture | [`search.md`](./search.md) |
| Move ordering & pruning | [`ordering-and-pruning.md`](./ordering-and-pruning.md) |
| Exemplars & TypeScript performance | [`exemplars-and-ts-perf.md`](./exemplars-and-ts-perf.md) |

## Sourcing caveat — read this before trusting a citation

**chessprogramming.org (CPW) returned HTTP 503 throughout the entire run**, and the
Wayback Machine was unreachable from the research tooling. Every stream hit it.

The agents therefore worked from primary sources they could open — engine source on
GitHub (Stockfish, Ethereal, Sunfish), the Rustic book, published write-ups, Wikipedia
— and cited CPW pages by URL from search snippets **without reading them**. Each digest
flags which claims are first-hand and which are not.

That is the honest state of the evidence. Where a number matters (perft counts, phase
formulas, tuning constants) prefer the first-hand citations, and re-verify the
snippet-only ones against CPW when it is reachable again.

## What the run changed

Three corrections to work already written, and one validation:

1. **[`../engine-core.md`](../engine-core.md)'s search acceptance criteria were unsound.**
   Two streams independently found flaws in the same criterion — see
   [`search.md`](./search.md) (TT grafting legitimately changes the chosen move) and
   [`ordering-and-pruning.md`](./ordering-and-pruning.md) (alpha-beta returns *a* best
   move, not *the* best move). Both are now fixed.
2. **[ADR 0003](../adr/0003-rule-configuration-in-the-hot-path.md) overstated the case
   against magic bitboards.** They need an ordered path with first-blocker semantics, not
   straightness. Amended.
3. **[`../../opponent/opponent-integration.md`](../../opponent/opponent-integration.md)'s
   cancellation design cannot work.** A worker inside negamax cannot process
   `postMessage`. Amended.
4. **Validated:** no TypeScript chess engine is currently a credible teaching artifact
   ([`exemplars-and-ts-perf.md`](./exemplars-and-ts-perf.md)), and our measured
   250k positions/sec is 15–20× below what readable typed-array JS reaches — so the
   TypeScript path has far more headroom than a WASM port would buy.
