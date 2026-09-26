# Task — Tighten the `Move` shape

> Raised by two independent research streams on 2026-08-02, for two unrelated reasons
> that happen to demand the same change.

## The problem

`src/game/types.ts` declares:

```ts
export interface Move {
  readonly from: Coord
  readonly to: Coord
  readonly special?: 'mirror'
  readonly captures?: Coord
}
```

Two optional properties, and both are a problem:

1. **Correctness / DRY** ([movegen research](./research/board-and-movegen.md)).
   `captures` duplicates information. The only case where the victim is not on `to` is en
   passant, and that square is derivable. Two sources of truth can diverge.
2. **Performance** ([V8 research](./research/exemplars-and-ts-perf.md)). Four
   presence/absence combinations means **four hidden classes**, so every call site that
   consumes a `Move` is polymorphic and possibly megamorphic. This costs nothing in
   clarity to fix.

## The change

- Make the fields **non-optional**, always assigned, in fixed order:
  `special: MoveSpecial | null`.
- Replace `captures` with a `MoveFlag` union (`quiet | capture | doublePush | enPassant |
  castleKing | castleQueen | promotion | promotionCapture`), deriving the captured square
  from `flag + to`.
- Construct every move through one factory so the shape is created identically
  everywhere.

## Why it is not done yet

`special: 'mirror'` is read by the UI for hint styling
(`src/shared/ui/square-presentation.ts`) and asserted in several e2e tests. The research
suggests replacing it with a derived `crossedSeam(move, geo): boolean` predicate, which
is the right end state but touches presentation.

**Sequence this before the engine's move representation is written**, so `src/engine/*`
is not built against a shape we intend to change.

## Acceptance criteria

- [ ] `Move` has no optional properties.
- [ ] Every move is created through a single factory.
- [ ] The captured square is derived, never stored.
- [ ] The UI still distinguishes portal moves, via a derived predicate.
- [ ] The full suite passes unchanged in behaviour.

---

## Done (2026-08-04)

Executed as part of [`../rules/special-moves.md`](../rules/special-moves.md), because
promotion forced `Move` to change anyway and doing it twice would have meant two UI
migrations.

- [x] `Move` has no optional properties — `{ from, to, flag, promotion, crossedSeam }`,
      all always assigned. One hidden class instead of eight.
- [x] Every move is created through `makeMove` in `src/game/move.ts`.
- [x] The captured square is derived by `capturedSquare(move)`, never stored.
- [x] The UI still distinguishes portal moves, and `special: 'mirror'` is gone.
- [x] The full suite passes, and move generation is now checked against **published chess
      perft** — a stronger guarantee of "unchanged in behaviour" than the original
      criterion asked for.

**One deviation, with a reason.** The research suggested replacing `special: 'mirror'`
with a fully derived `crossedSeam(move, geo)` predicate. It is instead a **field**, because
the generator knows the answer for free at emit time (`stepped.wrapped`, or the portal
branch it is standing in) and re-deriving it later means re-walking the ray. What mattered
was the *other* half of that recommendation — that it stop being a **rule input** — and
that is done: `reduceMove` matches on destination and promotion piece only, and the field
is documented as presentation-only. No rule branches on it.

The engine's move representation can now be written against a shape that is not going to
move under it.
