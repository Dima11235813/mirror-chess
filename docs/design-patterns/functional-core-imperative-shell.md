# Functional core, imperative shell

## The problem

Chess engines are full of state: a board, a search stack, a transposition table, a
clock. The conventional answer is global mutable state and side effects sprinkled
throughout, which makes the interesting logic impossible to test in isolation and
impossible to run twice with the same answer.

## How it looks here

Every rule is a pure function of its inputs. Nothing in `src/game/*` reads a clock,
touches storage, logs, or mutates its arguments.

```ts
// src/game/moves.ts
export function legalMovesFor(state: GameState, from: Coord): Move[]

// src/game/attacks.ts
export function isInCheck(pos: Position, color: Color): boolean

// src/game/status.ts
export function gameStatus(state: GameState): GameStatus
```

Effects live at the edges and only there:

| Layer | Allowed to |
| --- | --- |
| `src/game/*` | nothing but compute — no I/O, no clock, no mutation |
| `src/shared/persistence.ts` | touch `localStorage` |
| `src/App.tsx`, `src/components/*` | hold React state, respond to clicks |

Even `applyMoveToBoard` — the one function whose whole job is "change the board" —
returns a new board rather than editing one:

```ts
// src/game/board.ts
export function applyMoveToBoard(board: Board, move: Move): Board {
  const next: (Piece | null)[] = board.slice()
  // ...
  return next
}
```

## What it buys

- **The engine can be tested at all.** 235 unit tests run in about two seconds with no
  DOM, no browser and no fixtures beyond a position string.
- **[Oracle testing](./oracle-testing.md) becomes possible.** `perft` can walk 197,281
  positions precisely because generating moves has no consequences.
- **The search can move to a Web Worker later** without redesign: pure functions do not
  care which thread they run on, and `GameState` is plain data, so it structured-clones
  across a worker boundary for free.
- Determinism. The same inputs give the same answer, every time, which is what makes a
  self-play study reproducible from a seed.

## What it costs

**Allocation.** `legalMovesFor` copies a whole 64-entry board *per candidate move* to
test king safety. Measured on 2026-07-31: ~250k positions/second, which is fine for a
one-second opponent move and far too slow for a 64,000-game study.

That cost is accepted deliberately and quarantined rather than paid everywhere:
`src/game/*` stays pure and obvious, and the fast path that will use make/unmake
mutation lives separately and is proven equivalent by differential perft. See
[ADR 0002](../../prj-mgmt/epics/engine/adr/0002-two-implementations-one-oracle.md).

**The rule to remember:** if you are about to add mutation or a side effect to
`src/game/*`, you are in the wrong module.

## Where else it appears

- [Cohesive parameter object](./cohesive-parameter-object.md) — what pure functions
  take *instead of* reaching for ambient state.
- [Rules as data](./rules-as-data.md) — configuration arrives as an argument, which is
  what keeps the core free of globals.
