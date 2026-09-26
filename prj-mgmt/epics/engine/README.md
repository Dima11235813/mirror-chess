# Epic — The engine

The brain: move generation, evaluation, search.

This epic has **two deliverables of equal standing**:

1. **An engine that plays Mirror Chess well.**
2. **An engine a person can read and learn from.**

The second is not documentation added afterwards. It is a design constraint that
changes what we build, and it is allowed to cost performance.

---

## 1. Why a teaching-grade engine is worth building

Chess engines are among the least readable production software in existence, for
understandable reasons: decades of accumulated micro-optimisation, bitboard tricks with
magic constants nobody can derive by hand, single files thousands of lines long, global
mutable state, and identifiers like `ss->ply` and `tt.probe`. They are fast and they are
almost impossible to learn from. Someone who wants to understand how an engine works
typically has to read a tutorial *about* an engine rather than an engine.

There is room for one that is genuinely readable — and this project is unusually well
placed to write it:

- **The rules are already specified before the code** (`../rules/mirror-portal-spec.md`),
  so the engine can cite the rule it implements instead of encoding folklore.
- **A pure, obviously-correct reference implementation already exists** in `src/game/*`.
  That is normally the thing engines lack.
- **The rules are configurable** (`../balance/rule-flags.md`), which forces a clean
  separation between *what the game is* and *how we search it* — a separation most
  engines never make, because they hardcode chess.

## 2. The novelty: an engine that is 64 games at once

Every piece's portal is a feature flag, so one engine binary plays 64 different games —
including ordinary chess, when every flag is off.

This is genuinely unusual, and it is the most interesting thing about the architecture:

- **It forbids the usual shortcut.** A conventional engine bakes chess geometry into its
  attack tables. Ours cannot, so the boundary between rules and search has to be real
  rather than notional.
- **It gives us a free correctness oracle.** All-flags-off is chess, whose move counts
  are published to great depth. An engine that can be *configured into* a game with
  known answers can be verified in a way a bespoke variant engine cannot.
- **It is a teaching device in itself.** A reader can switch a rule off and watch the
  consequences propagate through generation, evaluation and search. Very few codebases
  let you ask "what if bishops couldn't do that?" and just run it.
- **It costs something**, and pretending otherwise would be the first lie in a codebase
  meant to teach. See [`adr/0003-rule-configuration-in-the-hot-path.md`](./adr/0003-rule-configuration-in-the-hot-path.md).

## 3. The spine: two implementations, one oracle

The organising idea for both correctness *and* pedagogy:

| | Reference | Fast path |
| --- | --- | --- |
| Lives in | `src/game/*` (exists today) | `src/engine/*` (to build) |
| Optimised for | being **obviously correct** against the spec | throughput |
| Style | pure, immutable, allocating freely | make/unmake, typed arrays, mutation |
| Role | the **oracle**, and the thing you read first | what actually runs in a search |
| Verified by | the spec's worked examples | differential perft against the reference |

The reference implementation is never deleted and never optimised. A reader learns the
rules from it, then reads the fast path knowing the two are *proven* to agree. This
turns "here is some clever code, trust me" into "here is the obvious version, here is
the fast version, and here is the test that says they are the same game".

## 4. Stories

- [`architecture.md`](./architecture.md) — module layout, types, naming, documentation
  standard, and the guided tour that is the actual learning artifact.
- [`engine-core.md`](./engine-core.md) — search: alpha-beta, quiescence, TT.
- [`evaluation.md`](./evaluation.md) — the hard part; deriving what pieces are worth in
  a game nobody has played.
- [`adr/`](./adr/) — Architecture Decision Records. The project already writes rules
  down before implementing them; this extends the habit to design.
- [`research/`](./research/README.md) — digests from the 2026-08-02 fan-out over
  authoritative engine practice, and what does or does not transfer to a configurable
  seam. **Inputs to the plan, not the plan.**

Consumed by [`../opponent/`](../opponent/README.md) (a person plays it) and
[`../balance/`](../balance/README.md) (it plays itself 64,000 times).

## 5. What "enterprise grade" means here, concretely

Not ceremony. Six specifics, each testable:

1. **Strict layering with a one-way dependency graph**, enforced by lint, not goodwill.
2. **Named domain types** — `Centipawns`, `Ply`, `Depth`, `NodeCount` — never a bare
   `number` whose meaning lives in a variable name.
3. **No unexplained constants.** Every magic number carries its provenance: measured,
   standard-and-cited, or guessed-and-flagged.
4. **Observability as a first-class feature** — the engine can explain a move: principal
   variation, evaluation breakdown, nodes, cutoffs. This serves debugging, the study,
   *and* the reader equally.
5. **Performance budgets in CI**, so "readable" never quietly becomes "slow" and
   optimisation never quietly becomes "unreadable".
6. **Decisions recorded as ADRs**, so the next reader learns *why*, which is the part
   tutorials always omit.

## 6. The tension, stated honestly

Readability and speed genuinely conflict in engine code. The resolution is not to
pretend otherwise but to **put the boundary somewhere explicit**: the reference stays
pure and obvious; the fast path may be clever, but every clever thing in it must carry
a comment explaining the trick and a differential test proving it. Cleverness without
both is a defect, however fast it runs.
