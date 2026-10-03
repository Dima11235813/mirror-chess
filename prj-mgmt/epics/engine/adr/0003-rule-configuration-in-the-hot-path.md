# ADR 0003 — Compile the rules into tables, not into branches

**Status:** proposed · **Date:** 2026-07-31

## Context

Every piece's portal is a feature flag ([`../../balance/rule-flags.md`](../../balance/rule-flags.md)),
so one engine plays 64 games. Move generation runs millions of times per search, and a
naive implementation would ask "is the bishop flag on?" inside that loop.

Conventional engines dodge this by **hardcoding chess geometry** into precomputed
tables — knight targets per square, and magic bitboards for sliders, where the relevant
occupancy bits along a ray are masked, multiplied by a constant and used to index a
table of attack sets. We cannot hardcode, because the geometry is configuration.

Magic bitboards also do not transfer *cleanly* here (though see the amended note under
Alternatives — they transfer better than this ADR first claimed). They are usually
described as resting on the assumption that a slider's ray is a **masked straight line**
on the board. The seam complicates that in two different ways:

- A **rank becomes a cycle** — a rook attacks along it in both directions and wraps.
  Tractable; cylindrical-chess engines do this.
- A **diagonal does not become a cycle.** Spec §4's hop is *free*: it preserves rank and
  does not consume a diagonal step, so a bishop leaving `a4` emerges at `h4` and only
  then resumes. The resulting path is not any straight line on the board, and no mask
  expresses it.

## Decision

**Precompute the geometry per ruleset and bind it once per search. The hot loop never
sees a rule flag.**

Two tables, built at engine construction from the ruleset:

1. **Stepper targets** — for knight, king and pawn-capture offsets, the destination
   square per origin, with the file already wrapped per §11, and a flag for whether it
   wrapped. 64 squares × a few offsets. Trivial.

2. **Slider ray paths** — for each `(square, direction)`, the **ordered list of squares
   the ray visits**, with the portal continuation already appended when the flag is on.

The second exploits a pleasing property of §4 that is worth stating plainly, because it
collapses most of the difficulty:

> **The portal is exactly equivalent to a longer ray.** A ray stops at the first
> occupied square. The portal fires only when the edge square is *empty* and continues
> beyond it. So appending the far-side squares to the precomputed path and walking it
> with the ordinary "stop at the first blocker" rule produces precisely the specified
> behaviour — including "an enemy on the edge square is a normal capture with no portal
> past it", which falls out for free.

So the bishop on `b3` gets the path `[a4, h5, g6, f7, e8]` for its north-west
direction, and the generator walks it exactly as a chess generator walks `[a4]`. Paths
terminate before revisiting the origin, which is where the "a rank ray cannot loop" rule
is enforced — once, at construction, rather than on every iteration.

**The hot loop becomes geometry-agnostic. All mirror complexity lives in table
construction.**

## Consequences

- No branching on rule flags during search, and no per-node cost for configurability.
- Move generation for the fast path looks like an ordinary chess generator, which makes
  it *more* readable, not less — a rare case where the fast thing is also the clear
  thing.
- The mirror rules are concentrated in one small, testable table-builder, which is
  exactly the rules/search boundary the [engine epic](../README.md) is built around.
- **Table construction becomes safety-critical**: a wrong path silently corrupts every
  search. Mitigated by ADR 0002's differential perft, which compares against the
  reference generator across rulesets and would catch it immediately.
- Memory is negligible: 64 squares × 8 directions × ≤15 squares, per ruleset, and only
  rulesets actually in use are built.
- Magic bitboards are **not adopted for v1**. If profiling later demands them they can go
  behind the same table interface; see the amended note under Alternatives for what they
  would and would not cost.

## Alternatives considered

- **Branch on flags inside generation.** Simplest, and it puts an unpredictable branch
  in the hottest loop in the program. Also scatters rule knowledge across the search
  layer, breaking the boundary this architecture exists to maintain.
- **Magic bitboards.** The standard answer, and awkward here — though **less awkward
  than this ADR originally claimed**. Amended 2026-08-02 after research
  ([`../research/board-and-movegen.md`](../research/board-and-movegen.md)): magics do
  not require *straightness*, they require a fixed **ordered path** per (square,
  direction) with first-blocker semantics, which we have. The mask can be built from the
  extended path's interior and the table filled by walking it. What we genuinely lose is
  the **edge-trim optimisation** (edge squares stop being irrelevant, so masks and tables
  grow) and the **rook rank⊕file decomposition**. Separately, the classic *shift-based*
  bitboard fill tricks do break on a bent ray. Revisit only if ray-walking is measured to
  be the bottleneck, and start with classic ray-mask + bitscan rather than magics.
- **Generate specialised code per ruleset.** Fastest in principle; a build-time code
  generator is far too much machinery, and it would make the engine much harder to read
  — which is a first-class goal, not a nice-to-have.
- **One table shared by all rulesets, masked at use.** Reintroduces per-node work to
  save memory we are not short of.
