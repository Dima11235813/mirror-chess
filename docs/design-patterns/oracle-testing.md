# Oracle testing

## The problem

Every test in this project verifies us against ourselves. The spec's worked examples,
the legality suite, the check-highlighting tests — all of them encode what we *believe*
the rules are. If a belief is wrong, the tests agree with the bug.

Move generation is exactly where this bites. It is easy to get subtly wrong in one case
out of a thousand, and unit tests only cover the cases somebody thought of.

## How it looks here

Find an **authority outside the project** and check against it.

Mirror Chess with every portal flag off *is* ordinary chess — and chess perft numbers
are published and independently reproduced by many engines:

```ts
// src/game/perft.test.ts
const PUBLISHED = [
  [1, 20],
  [2, 400],
  [3, 8_902],
  [4, 197_281],
]

it.each(PUBLISHED)('perft(%i) = %i', (depth, nodes) => {
  expect(perft(initialPosition(RULES_STANDARD_CHESS), depth)).toBe(nodes)
})
```

These pass. 197,281 positions at depth 4, matching a number nobody here chose.

**Why depth 4 and not 5:** the standard perft breakdown records zero en passant, zero
castles and zero promotions through depth 4 — they first appear at depth 5, with 258 en
passant captures. A generator lacking those rules can therefore match exactly up to
depth 4 and no further. The ceiling is a fact about our missing features, and it moves
when they land.

For the variants there is no authority — nobody has ever counted them — so those
numbers are **pinned baselines** instead, recorded the day the generator was verified
against chess:

```
BRQ---   20, 400,  9,690, 230,114
BRQNKP   20, 400,  9,852, 238,060
```

A change there means move generation changed. If that was not intended, it is a bug.

## What it buys

- **Correctness that does not depend on our own beliefs.** One number covers every case
  reachable in four plies at once.
- **Free calibration for the variant study.** The same control ruleset is what proves
  the self-play harness reports sane results before any variant is believed —
  `prj-mgmt/epics/balance/README.md` §4.
- **Fast bisection when it fails.** `perftDivide` breaks the total down by first move,
  so a mismatch localises to a piece and square instead of being stared at.

## What it costs

- Runtime. Depth 4 is ~1 second per ruleset in the pure reference implementation, which
  is a real slice of a two-second test suite. Worth it.
- An oracle only covers what it covers: perft counts *moves*, so it says nothing about
  whether the engine *evaluates* well.
- It only exists because of a lucky property — that all-flags-off is a game somebody
  else already solved. Most variant projects have no such luxury, which is a reason to
  guard the property rather than spend it.

## The sibling pattern

When no external authority exists, manufacture one: run two implementations and compare
them. That is **differential testing**, and it is how the future fast move generator
will be checked against today's obvious one —
[ADR 0002](../../prj-mgmt/epics/engine/adr/0002-two-implementations-one-oracle.md).
Perft is the comparison function in both cases.

## Where else it appears

- [Rules as data](./rules-as-data.md) — being *able* to configure the engine into
  ordinary chess is what creates the oracle.
- [Open registry](./open-registry.md) — `------` is catalogued as the `control` because
  it has this job.
- [Functional core](./functional-core-imperative-shell.md) — walking 197,281 positions
  is only safe because generating moves has no side effects.
