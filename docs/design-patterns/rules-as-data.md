# Rules as data, not branches

## The problem

Six independent flags describe 64 games. The naive encoding scatters them:

```ts
// don't
if (piece.kind === 'B' && bishopsPortal) { /* ... */ }
if (piece.kind === 'R' && rooksPortal) { /* ... */ }
```

Every new rule multiplies the branches, the flags leak into modules that should not
know about them, and bishop, rook and queen drift apart the first time someone fixes a
bug in one and forgets the other two.

## How it looks here

The configuration is a **value**, and reading it happens in exactly one function.

```ts
// src/game/rules.ts
export interface RuleSet {
  readonly portal: Readonly<Record<Kind, boolean>>
}

export function portalEnabled(rules: RuleSet, kind: Kind): boolean {
  return rules.portal[kind]
}
```

`Record<Kind, boolean>` is doing real work: it is *total*. Every piece kind must have an
entry, so a lookup can never be `undefined` and adding a piece would be a compile error
rather than a silent `false`.

Generation asks once, at one place per concern:

```ts
// src/game/moves.ts — all three sliders share one path, so they cannot drift
function sliderMoves(state: GameState, from: Coord, p: Piece, dirs: readonly Direction[]): Move[] {
  const res = slideMoves(state, from, p, dirs)
  if (portalEnabled(state.rules, p.kind)) pushAll(res, portalMoves(state, from, p, dirs))
  return res
}
```

```ts
// src/game/attacks.ts — the same question, so moves and attacks cannot disagree
const crosses = portalEnabled(rules, piece.kind)
```

**The bug this prevents** is specific and nasty: suppress a piece's portal *moves* but
not its *attacks*, and a king is "in check" from a piece that cannot legally reach it —
every legality test then quietly disagrees with the move generator. Asking the same
question through the same function on both sides is what stops it. `rules.test.ts`
asserts moves and attacks vanish together for each flag.

## What it buys

- **Open/closed.** New permutations need no code change; they are new *values*.
- **DRY.** One read point, one slider path. Fixing the portal fixes it for B, R and Q.
- **A future optimisation stays possible.** Because the rules are data, they can later
  be *compiled* into precomputed ray tables so the hot search loop never tests a flag —
  see [ADR 0003](../../prj-mgmt/epics/engine/adr/0003-rule-configuration-in-the-hot-path.md).
  That option only exists because the flags were never scattered as branches.

## What it costs

- Indirection: you cannot see from `moves.ts` alone what a bishop does; you have to know
  a `RuleSet` is involved. Mitigated by there being exactly one accessor to find.
- Data must be threaded to where it is read, which is why
  [`Position`](./cohesive-parameter-object.md) exists.
- A per-node lookup in the hot path. Acceptable in the reference implementation, and the
  reason ADR 0003 plans tables for the fast one.

## Where else it appears

- [Open registry](./open-registry.md) — the same idea one level up: rulesets themselves
  are data, catalogued rather than coded.
- [Parse, don't validate](./parse-dont-validate.md) — how a ruleset gets named and
  safely reconstructed from a string.
- [Oracle testing](./oracle-testing.md) — with every flag off the data describes
  ordinary chess, which is what makes the external check possible at all.
