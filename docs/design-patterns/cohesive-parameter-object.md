# Cohesive parameter object

## The problem

Attack generation used to take a board:

```ts
attacksFrom(board: Board, from: Coord): Coord[]
```

Then the rules became configurable, and the answer stopped depending only on the board:
the same arrangement of pieces attacks different squares under different rulesets. The
obvious fix is to add a parameter — and then add it again to `isSquareAttacked`,
`isInCheck`, `checkingPieces`, `checkPath`, and every call site of all five.

That works, and it is noisy. Worse, it says the wrong thing: it implies board and rules
are two independent inputs that happen to be needed together.

## How it looks here

Name the pair. Attacks are a property of a **position**, not of a board.

```ts
// src/game/types.ts
export interface Position {
  readonly board: Board
  readonly rules: RuleSet
}

export interface GameState extends Position {
  readonly turn: Color
  readonly inCheck: boolean
}
```

```ts
// src/game/attacks.ts
export function attacksFrom(pos: Position, from: Coord): Coord[]
export function isInCheck(pos: Position, color: Color): boolean
```

Because `GameState` *extends* `Position`, every existing `GameState` is already a valid
argument — no adapter, no destructuring at the call site. Structural typing means the
change cost one line in the test helper:

```ts
// before: returned a Board
const boardOf = (spec: string): Position => fromPiecesSpec(spec, 'white')
```

Callers that legitimately have only a board construct the pair explicitly, which reads
as the intent it is — "this board, under these rules":

```ts
// src/game/moves.ts — legality filtering, on the board *after* a candidate move
isInCheck({ board: applyMoveToBoard(state.board, m), rules: state.rules }, piece.color)
```

## What it buys

- **One parameter instead of two**, at five signatures and every call site.
- **A better model.** The type now states a fact about the domain: you cannot ask what
  a board attacks without saying which game is being played.
- **Liskov substitution, for free.** Anything accepting a `Position` accepts a
  `GameState`, so the UI and the tests pass whole states around without ceremony.
- **Interface segregation** stays possible: `findKing(board: Board, color)` still takes
  only a `Board`, because finding a king genuinely does not depend on the rules. Take
  the narrowest type that works.

## What it costs

- One more named type to learn.
- Callers holding a bare board must construct the object, which is marginally more
  verbose than passing a second argument — but explicit about what it is doing.
- The temptation to keep growing it. `Position` earns its place because *both* fields
  are needed by *every* function that takes it. A field only some callers use belongs
  somewhere else — which is exactly why `turn` and `inCheck` live on `GameState` and
  not on `Position`.

## Where else it appears

- [Functional core](./functional-core-imperative-shell.md) — pure functions cannot reach
  for ambient state, so what they *take* has to be right.
- [Rules as data](./rules-as-data.md) — `Position` is the vehicle that carries the
  ruleset into the core.
