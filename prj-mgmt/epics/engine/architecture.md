# Story — Engine architecture and its documentation

> Part of the [engine epic](./README.md). This story is about **how the engine is
> built and explained**, and it gates the others: `engine-core.md` and
> `evaluation.md` are written inside the structure defined here.

## Summary

As someone learning how chess engines work, I want to read this engine and understand
it — layer by layer, with each concept named, each decision justified, and a guided
route through the code — so that the engine is a teaching artifact and not just a
program that wins games.

## 1. Layers

One-way dependencies, outermost depending on innermost, never the reverse:

```
  rules/        what the game is        RuleSet, spec constants
  board/        representation          Board, Coord, Piece, make/unmake
  movegen/      what moves exist        generation, attacks, perft
  eval/         what a position is worth material, mobility, terms
  search/       which move to choose     alpha-beta, quiescence, ordering, TT
  host/         how it is driven         worker, time management, protocol
```

- **`rules` knows nothing about search.** A rule change must never require touching
  `search/`. This is the boundary the feature flags exist to keep honest.
- **`eval` may read the ruleset** — a bishop is worth something different when it can
  cross — but must not call into `search`.
- **`host` is the only layer allowed a clock, a thread or I/O.** Everything below it is
  pure and deterministic, which is what makes the whole engine testable.
- Enforced by an ESLint import-boundary rule, so the graph is checked rather than
  hoped for.

## 2. Types: no bare numbers

Engines are full of unlabelled integers that mean wildly different things — a score, a
depth, a ply, a node count, a square index — and confusing two is a classic bug that
type systems are meant to prevent.

```ts
/** Score in hundredths of a pawn, from the side to move's point of view. */
export type Centipawns = number & { readonly __brand: 'Centipawns' }
/** Plies remaining to search. */
export type Depth = number & { readonly __brand: 'Depth' }
/** Plies from the root — distinct from Depth, and mixing them is a real bug. */
export type Ply = number & { readonly __brand: 'Ply' }
```

~~**[decision]**~~ **Settled (2026-08-04): brand all three, leave counters plain.**
See [ADR 0006](./adr/0006-engine-layers-and-branded-quantities.md). Implemented in
`src/engine/types.ts`.

`Depth` versus `Ply` deserves the comment it gets. It confuses everyone once.

## 3. Documentation standard

CLAUDE.md §7 already requires JSDoc on every export. For the engine the bar is higher,
because the audience includes someone who does not yet know what the thing *is*:

Every non-obvious module opens with a comment that answers, in order:

1. **What is this?** — in plain language, assuming no engine background.
   *"A transposition table is a cache of positions we have already searched. The same
   position often arises by different move orders — hence 'transposition' — so without
   it we redo the same work many times."*
2. **Why is it here?** — what it buys, ideally with a measured number.
3. **How does it work?** — the mechanism, including the trick if there is one.
4. **What is subtle?** — the thing that bites you. For us, very often: *what does the
   mirror seam change about this?*

Point 4 is the highest-value one and the easiest to skip. Every standard engine
technique meets the seam somewhere, and each of those meetings is exactly what a reader
of *this* engine wants explained.

## 4. Observability: an engine you can watch think

Serves debugging, the study and the learner with one mechanism.

- [ ] A search reports its **principal variation**, depth, score, nodes and time.
- [ ] Evaluation can return a **breakdown by term**, not just a total, so "why is this
      position +1.4?" has an answer.
- [ ] Optional counters: cutoffs, TT hit rate, quiescence nodes, branching factor.
- [ ] A dev-only UI panel showing the above while the engine thinks — the "why did you
      play that?" view. This is the single feature most likely to make the project
      genuinely useful to a learner, and it costs little on top of the data the search
      already has.

Instrumentation must be **switchable off with zero cost in the hot path**, or it will be
removed later by someone chasing nodes/second.

## 4a. Patterns

Named and cross-linked in [`docs/design-patterns/`](../../../docs/design-patterns/README.md),
each note stating the problem, the code here that uses it, what it buys and what it
costs. Already written, from the rule-flag work:

- [Functional core, imperative shell](../../../docs/design-patterns/functional-core-imperative-shell.md)
- [Parse, don't validate](../../../docs/design-patterns/parse-dont-validate.md)
- [Cohesive parameter object](../../../docs/design-patterns/cohesive-parameter-object.md)
- [Rules as data, not branches](../../../docs/design-patterns/rules-as-data.md)
- [Open registry](../../../docs/design-patterns/open-registry.md)
- [Oracle testing](../../../docs/design-patterns/oracle-testing.md)

## 5. The guided tour (the actual learning artifact)

- [ ] `docs/engine/README.md` — a walkthrough in **reading order**, not alphabetical:
      board representation → move generation → why perft proves it → evaluation →
      minimax → alpha-beta → move ordering → quiescence → transposition tables →
      time management. Each section links to the real code and stays short; the code is
      the text, the guide is the map.
- [ ] Each section ends with **"what the mirror seam changes here"**, which is what
      makes this guide different from every other engine tutorial.
- [ ] A `docs/engine/glossary.md`: ply, node, cutoff, PV, quiescence, horizon effect,
      SEE, transposition, perft, centipawn.
- [ ] The tour is **verified by CI**: every code path it references must exist. A guide
      that rots is worse than none, and link-checking is cheap.

## 6. Acceptance Criteria

- [x] The layer graph above exists and is **enforced by a check** —
      `scripts/check-layer-boundaries.js`, run with `npm run check:layers`. It is a script
      rather than a lint rule for a reason recorded in
      [ADR 0006](./adr/0006-engine-layers-and-branded-quantities.md): ESLint does not
      currently run in this repo at all, so a lint rule would have looked enforced without
      being enforced.
- [x] `Centipawns`, `Depth` and `Ply` are distinct types; mixing them fails to compile.
- [x] Every engine module opens with a doc comment answering §3's four questions —
      including the fourth, which for `eval.ts` is most of the file.
- [x] No unexplained numeric constant. `PAWN_VALUE` is *convention*, `MATE_SCORE` and
      `MAX_PLY` are *standard practice*, `PIECE_VALUES` are *inherited from chess and
      flagged as almost certainly wrong here*, `MOBILITY_WEIGHT` is *guessed*.
- [x] Search exposes PV, depth, score and nodes; evaluation exposes a per-term breakdown,
      with a test asserting the terms sum to the total. **Time is deliberately absent** —
      reading a clock is a host-layer privilege, and the boundary check enforces it.
- [ ] Instrumentation compiles out, evidenced by a benchmark with it on and off.
      *Partly done:* `evaluate` and `evaluateVerbose` are separate functions so the search
      never allocates a term it will not read, and a test pins them together. There is no
      benchmark yet.
- [x] The guided tour exists (`docs/engine/README.md` + `glossary.md`), is linked from the
      repo readme, and its references are checked by `npm run check:docs`. That checker
      found a real broken claim within minutes of being written.
- [x] Every architectural decision of consequence has an ADR — 0006 covers this story.
- [ ] A reader unfamiliar with the codebase can follow the tour and explain how a move
      is chosen. **Tested by asking one.**

That last criterion is the real one. The others are proxies for it, and it is the one that
cannot be self-assessed — it stays open until somebody who did not write this reads it.

## 8. Status (2026-08-04)

**Built, and working:**

| Piece | File |
| --- | --- |
| Branded quantities, mate scoring, `Depth` vs `Ply` | `src/engine/types.ts` |
| Evaluation — material + mobility, geometry-free on purpose, with per-term breakdown | `src/engine/eval.ts` |
| Negamax, alpha-beta, PV extraction, mate distance | `src/engine/search.ts` |
| Layer boundary check | `scripts/check-layer-boundaries.js` |
| Doc link check | `scripts/check-docs-links.js` |
| Guided tour + glossary | `docs/engine/` |

The engine plays legal, sensible moves under every ruleset. It wins a hanging queen,
declines a poisoned capture, finds mate in one and prefers it to material, and finds the
**king-and-bishop mate that exists only because of the seam** — a mate no chess engine
would ever look for.

The keystone test is `alpha-beta ≡ negamax`: both are implemented, and they must agree on
score *and* on chosen move. That is ADR 0002's habit applied inside the engine, and it is
what will make every later optimisation safe to add.

**Not built, and next** — see [`engine-core.md`](./engine-core.md):

- Move ordering. The cheapest large speedup available, and alpha-beta's power depends
  entirely on it.
- Quiescence search. Until it exists the horizon effect is fully present.
- Transposition table, with the ruleset-salting trap noted in the tour §9.
- Iterative deepening and time management, which need the host layer.
- A differential perft harness against `src/game/*` once the engine grows its own
  generator.

**A measurement worth recording.** Evaluation calls `legalMovesFor` for both sides at every
leaf, which roughly triples leaf cost. That is why the unpruned searcher is only usable to
depth 3 in tests. Incremental mobility is the fix when it matters — deleting the term is
not, since with no geometry at all, material alone cannot tell a developed position from a
dormant one.

## 7. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/engine/types.test.ts` | branded types reject mixing (type-level tests) |
| Lint | `eslint.config.js` | layer import boundaries |
| Unit | `src/engine/observability.test.ts` | PV is legal from the root; eval breakdown sums to the total |
| CI | `scripts/check-docs-links.js` | every path the tour cites exists |
| Bench | `src/engine/bench.ts` | instrumentation on vs off |

The eval-breakdown test is worth more than it looks: if the parts do not sum to the
whole, the explanation the reader is shown is a lie, and lying to the reader is the one
failure this epic cannot tolerate.

## Definition of done

An engine whose layers are enforced, whose types carry meaning, whose every clever line
explains itself, that can show its reasoning, and that comes with a tour a newcomer can
actually follow.
