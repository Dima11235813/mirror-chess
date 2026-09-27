# ADR 0005 — Flat 64 mailbox with a compiled geometry, not a padded board

**Status:** accepted · **Date:** 2026-08-02

## Context

The engine needs a board representation before anything else can be written. The
standard options each carry an assumption about the *shape of a chessboard*, and we have
changed that shape: the `a`- and `h`-files are linked, so a slider's ray can continue
across the seam and a stepper's destination file wraps.

Research on 2026-08-02 ([`../research/board-and-movegen.md`](../research/board-and-movegen.md))
surfaced a fact that settles this more sharply than expected.

## Decision

**A flat 64-square mailbox, with all geometry precomputed into a `Geometry` compiled
per ruleset, and `Square = 0..63` as a branded integer inside the engine.**

```ts
export type Square = number & { readonly __brand: 'Square' }   // 0..63

export interface Geometry {
  readonly slideRays: readonly (readonly (readonly Square[])[])[] // [from][dir] → ordered path
  readonly knightTargets: readonly (readonly Square[])[]
  readonly kingTargets: readonly (readonly Square[])[]
  readonly pawnCaptures: readonly (readonly (readonly Square[])[])[]
}

export function compileGeometry(rules: RuleSet): Geometry
```

`Coord {f, r}` stays, but only at the UI boundary. Inside movegen and search, squares are
integers with `file()`, `rank()` and `algebraic()` helpers.

Two implementation notes that are easy to get wrong and expensive to discover late:

- **A horizontal rook ray is a cycle.** Walking right from `a4` reaches `h4` and returns
  to `a4`. Every compiled path must be capped at 7 squares, or terminate before
  re-entering its origin, or the rook attacks itself and the walk never ends. Rays with a
  rank component always terminate on rank overflow, so only the horizontal case needs it.
- **Memoise `Geometry` by the ruleset's flag bitmask.** There are 64 rulesets, so a
  `Map<number, Geometry>` *is* the whole "compile once per search" story.

## Consequences

- The hot loop has **one shape** for every slider under every ruleset — the DRY payoff
  that [ADR 0003](./0003-rule-configuration-in-the-hot-path.md) predicted.
- Geometry lives in data, so the mirror rules are concentrated in one small, testable
  table-builder rather than smeared across generation.
- `Square` as a branded int removes per-step object allocation and makes every table
  directly indexable. Combined with an `Int8Array` board later, it also removes all
  off-board arithmetic.
- **A new load-bearing assumption appears**: the planned reverse-attack ("superpiece")
  optimisation — asking "does a friendly piece of kind K on this square see an enemy K?"
  — is only sound if the attack relation is **symmetric**: A attacks B ⟺ a same-kind
  piece on B attacks A. Our rank-preserving hop and modulo-8 wrap *look* symmetric, but
  the whole scheme collapses if they are not. **This earns a property test over all 64×64
  square pairs × 6 kinds × 64 rulesets**, and it is the single highest-value test in the
  movegen layer.
- Migration cost: the existing core uses `Coord` objects throughout. The reference
  implementation in `src/game/*` keeps them (ADR 0002 — it is not optimised); the new
  `src/engine/*` uses `Square`. The conversion lives at the boundary.

## Alternatives considered

- **10×12 padded mailbox** (Sunfish, VICE). Rejected, and worth stating why precisely:
  the padding exists **specifically to prevent file wrap-around**. Its entire value
  proposition is that the edge of the board is a wall — the thing we are deleting. It is
  not merely unsuitable, it is an optimisation *against* our rules.
- **0x88** (chess.js). Rejected for the same class of reason. Its `from - to` delta
  tables assume a ray is a straight line in linear index space; `a4 ↔ h4` is already a
  legal delta, so same-line and direction tests misclassify.
- **Bitboards with magic multipliers.** Deferred, not rejected — see the amended
  Alternatives section of ADR 0003. They need an ordered path with first-blocker
  semantics rather than straightness, so they can be rebuilt here, at the cost of the
  edge-trim optimisation and the rook rank⊕file decomposition. Classic ray-mask + bitscan
  first; magics only if profiling demands it.
- **Keeping `Coord {f, r}` in the engine.** Rejected on two independent grounds: it
  allocates in the hot loop, and it cannot index a table without arithmetic on every
  access. It remains correct and stays in the reference implementation.
