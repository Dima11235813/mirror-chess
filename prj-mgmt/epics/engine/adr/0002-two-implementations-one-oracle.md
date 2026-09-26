# ADR 0002 — Keep a slow reference implementation alongside the fast one

**Status:** accepted · **Date:** 2026-07-31

## Context

`src/game/*` generates moves in a way that is pure, immutable, allocates a fresh board
per legality check, and reads almost exactly like the rules spec it was derived from. It
manages ~250k positions/second (measured 2026-07-31).

That is fast enough to play a person at depth ~6 but far too slow for the variant
study's ~64,000 games, so a fast path is coming: make/unmake instead of copying, typed
arrays, attack-from-square lookups. Every one of those techniques trades clarity for
speed.

The conventional move is to optimise in place and let the readable version disappear
into history. For an engine meant to be **read**, that would destroy the primary asset.

## Decision

**Keep both, permanently.**

- `src/game/*` remains the **reference implementation**: pure, obvious, spec-shaped,
  and never optimised. It is what a reader reads first and what the tests trust.
- `src/engine/*` holds the **fast path**, free to be clever.
- The two are tied together by **differential perft**: for every ruleset, from a suite
  of positions, to depth 4+, they must generate identical move counts. Not hand-written
  expectations — a comparison.

The reference is not legacy code awaiting deletion. It is a load-bearing component with
two jobs: teaching, and being the oracle.

## Consequences

- **Correctness stops depending on our cleverness.** Any optimisation that changes
  behaviour is caught by a test that knows the right answer independently.
- **The learning path becomes two-stage**: read the obvious version, then read the fast
  version knowing they provably agree. This is a much better teaching structure than
  either alone, and it is the spine of the engine epic.
- **Two implementations must be kept in step.** A rule change touches both. Mitigated by
  the differential test failing loudly, and by rules changing rarely once specified.
- Some duplicated logic, accepted deliberately.
- All-flags-off is ordinary chess, so the reference can additionally be checked against
  **published chess perft numbers** — an external oracle, which is rare and valuable.

## Alternatives considered

- **Optimise in place, keep only the fast version.** Standard practice; rejected because
  it deletes the teaching artifact and leaves correctness resting on review alone.
- **Keep the reference only as test fixtures.** Fixtures are static; the reference can
  be *run* on any position, which is what makes differential testing possible at all.
- **Generate the fast path from the reference.** Attractive, and far too much machinery
  for a project this size.
