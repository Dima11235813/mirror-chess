# ADR 0006 — Engine layers, and giving its numbers types

**Status:** accepted · **Date:** 2026-08-04

## Context

`src/engine/*` is being written for the first time. Two decisions had to be made before
any of it existed, because both are cheap now and expensive later: how the layers depend on
each other, and whether the quantities an engine passes around get real types or stay bare
`number`s.

Both were flagged in [`architecture.md`](../architecture.md); the branded-types question
carried an explicit `[decision]` marker.

The pressure behind them is that a chess engine's characteristic bugs are not exotic
algorithm errors. They are:

- some layer quietly reaching sideways (evaluation calling search, search reading a clock)
  until nothing is testable in isolation;
- two integers that mean different things being swapped, and the program continuing to run
  while playing worse.

## Decision

### 1. One-way layers, checked by a script

```
  game/ (rules)  →  engine/types  →  engine/eval  →  engine/search  →  engine/host
```

Three rules, enforced by `scripts/check-layer-boundaries.js`:

1. **`src/game/*` must not import `src/engine/*`.** It is the reference implementation and
   the correctness oracle ([ADR 0002](./0002-two-implementations-one-oracle.md)); a
   dependency on the engine destroys its independence as evidence.
2. **Evaluation must not import search.** Evaluation may read the `RuleSet` — a bishop
   genuinely is worth something different when it can cross the seam — but an evaluation
   that searches is not static, and its cost stops being predictable.
3. **Only `engine/host/` may use a clock, a timer, a thread or randomness.** Everything
   below is pure and deterministic.

Rule 3 is the load-bearing one. Determinism is what makes a self-play result reproducible
and a search bug reducible to "this position, this ruleset, this depth" — and determinism
is lost by accident, one `Date.now()` at a time.

### 2. Brand `Centipawns`, `Depth` and `Ply`; leave counters plain

```ts
export type Centipawns = number & { readonly __brand: 'Centipawns' }
export type Depth = number & { readonly __brand: 'Depth' }
export type Ply = number & { readonly __brand: 'Ply' }
export type NodeCount = number   // plain: nobody confuses a node count with a score
```

Branding costs nothing at runtime — these are `number`s, with a phantom property that
exists only in the type system — and it is deliberately applied to exactly the three that
get confused, not to everything numeric.

`Depth` and `Ply` are the pair that justifies the whole decision. They are opposites
(`depth` counts down toward the leaves, `ply` counts up from the root), they are both small
non-negative integers, and they coincide near the root — so a swap is invisible in testing
and shows up as the engine preferring a mate in five to a mate in three.

## Consequences

**Good.** Swapping a depth for a ply is a compile error. The layer graph is checked rather
than hoped for, and the check names *why* each rule exists when it fires, so a future
contributor learns something instead of just being blocked. A reader of `types.ts` gets the
`Depth`/`Ply` distinction explained at the moment they first need it.

**Costs.** Every construction goes through `cp()`, `depth()` or `ply()`, which is friction
at the boundaries — the standard price of branded types, and the reason counters were left
alone. The layer check is a bespoke script rather than an idiomatic lint rule.

**The honest caveat about that script.** The story asked for an ESLint import-boundary
rule, and that is the right eventual home. It is not the home today: the repo carries a
legacy `.eslintrc.cjs` while its installed ESLint 9 expects a flat `eslint.config.js`, so
*no* lint rule currently runs at all. Writing the rules into `.eslintrc.cjs` would have
produced boundaries that look enforced and are not — strictly worse than a plain script,
because it would be believed. The script runs today; move it into ESLint when the
flat-config migration happens, and treat `check-layer-boundaries.js` as the specification
for that move.

## Alternatives rejected

**Plain type aliases** (`type Centipawns = number`). Documents intent, catches nothing, and
`Depth`/`Ply` is exactly the case where documentation has never been enough — everyone has
read that distinction and still made the mistake.

**Brand everything numeric**, including node counts and square indices. More friction, and
the additional cases are ones nobody actually confuses. Brand what gets swapped.

**Convention instead of a check.** The layering was already written down in
`architecture.md`; it is being turned into a check precisely because writing it down was
not enough to keep the docs themselves honest — `check-docs-links.js`, added the same day,
immediately found a story claiming a regression test that had never existed.

**A single `Position` type carrying everything.** Rejected earlier, and worth recording
here because it is the same instinct: attack generation genuinely does not depend on
castling rights, so `Position` / `MovePosition` / `GameState` are kept separate and a class
of bug becomes unwritable rather than merely discouraged.
