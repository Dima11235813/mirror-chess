# Research — exemplars & TypeScript performance

> Fan-out stream 5 of 5, 2026-08-02. See [`README.md`](./README.md) for the CPW-503
> caveat; rustic-chess.org also returned 403 to the fetcher. The V8 posts, MDN pages and
> the movegen benchmark were fetched directly.

## Part A — what to steal, and from whom

**Sunfish** (Python, 131 lines). Steal the **data-first discipline**: the board is one
string, directions are a table, movegen is a double loop over that table — six piece
types collapse into ~15 lines with no special-casing. Do **not** steal the cost: its
compactness came from *deleting features and names*, not from better structure. No
50-move rule, no midgame/endgame distinction, single-letter identifiers, a
rotate-the-board trick. You can read it in ten minutes and still not know how en passant
works. **Our goal is the inverse: minimal concepts, generous names.**

**Stockfish.** Instructive in three specific places: `movegen.h`'s generation-type
taxonomy (CAPTURES / QUIETS / EVASIONS / LEGAL as distinct entry points — a design
decision, not an optimisation), `position.h`'s `StateInfo` chain for O(1) undo, and
`movepick.h`'s staged picker. A useful signal in the file sizes: `evaluate.cpp` is 3.9 KB
and `movegen.cpp` 9.7 KB, while `search.cpp` is 93 KB — **the small files are the ones
with a crisp responsibility; the giant ones are where tuning accreted.** Ignore anything
whose comment explains a hardware fact.

**Vice / "Programming a Chess Engine in C".** The best *pedagogical sequence* in the
space: board rep → move encoding → movegen → perft → make/unmake → search → eval → UCI.
**Steal the curriculum, not the code** — CPW's own summary says it is "by no means to be
considered best practice" (deliberately simplified C with globals).

**Rustic.** The closest existing thing to our goal: the engine ships **with a book**, and
roughly 35% of source is comments explaining *why*. That is the model — narrative docs
adjacent to the code and versioned with it. One anti-pattern to avoid: its movegen module
is named `wizardry`. **Cute names defeat the teaching goal.**

**Carp** (Rust, self-described didactic). Steal its top-level split verbatim: three
workspaces — `Chess` (rules/board/movegen), `Engine` (search + protocol), `Tools` — with
the first **dependency-less**. That is exactly our rules→movegen versus eval→search
boundary, **enforced by the build system rather than by good intentions.**

**The JS/TS landscape, honestly.** *Lozza* is the strongest pure-JS engine — 12×12
mailbox, piece lists, NNUE, designed to drop into a Worker — but written for speed, not
instruction. *Tonnetto* (TypeScript, 10×12 mailbox, typed arrays, ~1600 Elo) is the
closest peer and its README admits depth > 5 is too slow. *chess.js* is a well-tested
rules library with no search.

> **There is currently no TypeScript chess engine that is a credible teaching artifact.
> That gap is the opportunity.**

### Recommended layout

Enforce with a lint rule on import direction; each layer imports only downward.

```
src/engine/
  rules/     ruleset.ts · presets.ts · seam.ts
  board/     square.ts (branded int) · piece.ts · position.ts · fen.ts · zobrist.ts
  movegen/   offsets.ts (data only) · rays.ts (seam-aware) · pseudo.ts · legal.ts · attacks.ts · move.ts
  eval/      material.ts · mobility.ts · evaluate.ts
  search/    negamax.ts · quiescence.ts · ordering.ts · tt.ts · limits.ts
  host/      protocol.ts · worker.ts · api.ts     ← only layer that knows about Workers
  bench/     perft.ts · positions.ts · differential.ts
```

`rules/ + board/ + movegen/` must build and test with **zero imports** from `eval/`,
`search/`, `host/`. Keep direction tables in their own files so the code that walks them
stays short — the Sunfish lesson without the Sunfish cost.

## Part B — V8 performance

### Do now, at no cost to readability

1. **Fix the optional properties on `Move`.** `types.ts` declares `special?: 'mirror'`
   and `captures?: Coord`. Four combinations = four hidden classes = a polymorphic,
   possibly megamorphic call site everywhere a move is consumed. Make them non-optional
   (`special: MoveSpecial | null`), always assigned, in fixed field order. **Identical
   clarity, monomorphic shape.** *(Stream 1 recommended removing these fields for an
   unrelated reason — single source of truth. Two independent arguments for the same
   change.)*
2. **Packed, single-type arrays.** Element-kind transitions are one-way, holey arrays
   cost prototype-chain checks, and V8 documents a **6× regression** from reading past
   `length` alone. Never sparse-allocate, never `delete`, never read out of bounds.
3. **`Int8Array` mailbox for the board.** Typed arrays win exactly where we are: fixed
   length, one type, index-hot, and they cannot go holey. With `Square` as a branded int
   plus `file()` / `rank()` / `algebraic()` helpers this is *more* readable than
   `Coord {f,r}` objects, not less.
4. **Numeric piece and colour codes** inside movegen, with named constants. Keep strings
   at the FEN/UI boundary only.
5. **One `push` loop per generator**; never `concat` or spread accumulation.

### The allocation nuance that corrects conventional wisdom

V8's Orinoco scavenger costs are **proportional to the number of *surviving* objects, not
the number of allocations**. So short-lived move objects really are close to free, and
the usual "allocation kills you" advice is overstated for a readable v1. What hurts is
objects that **survive** — a move list outliving its node, a PV array kept per ply.
Preallocate per-ply move buffers once at search init, indexed by depth.

### Move-as-integer: later, and with one hard constraint

When packing a move into an int, keep the whole thing **≤ 30 bits so it stays a Smi**
under pointer compression. Exceeding that boxes it as a heap number and you lose
everything you gained. Classic layout `from:6 | to:6 | flags:4` leaves room for seam
flags. Confine encode/decode to one module with a round-trip property test.

### The realistic ceiling

From a benchmark running five implementations through the same perft harness, in-browser
at depth 5:

| Implementation | nps |
| --- | --- |
| JS 0x88 | ~5.6 M |
| AssemblyScript | ~12.5 M |
| Rust-WASM 0x88 | ~18 M |
| Rust-WASM bitboard | ~25.8 M |

So **WASM buys roughly 4–6× over tuned JS, not 50×.** Native C with bulk counting and
threads reaches 200M+, but apples-to-apples the honest gap is JS ≈ 1/5 of WASM and
≈ 1/10–1/30 of a tuned native engine.

> **The planning consequence:** our current 250k positions/sec is **15–20× below what
> readable typed-array JS achieves**. Items 1–5 above are therefore worth more than a
> WASM port, and the WASM decision should wait until the TS implementation is actually
> near its own ceiling.

### Web Worker — one finding that changes our design

Message payloads (a position in, a move out) are bytes; **structured clone is irrelevant
at that size — do not design around it.** `ArrayBuffer` transfer is zero-copy but
*detaches* the sender's buffer, so it is wrong for a persistent transposition table.

The real reason to want `SharedArrayBuffer` is **the stop command**:

> A worker spinning inside negamax **cannot process `postMessage`**. This is exactly why
> Lozza documents that it does not support `stop`.

A 1-byte SAB flag polled every ~2048 nodes fixes it — but `SharedArrayBuffer` requires
COOP/COEP cross-origin isolation, a real deployment constraint. Never `Atomics.wait` on
the main thread.

**This invalidates the cancellation design in
[`../../opponent/opponent-integration.md`](../../opponent/opponent-integration.md)**,
which specifies a `cancel` message over `postMessage`. It would sit in the queue until
the search finished — precisely when it is no longer needed.

## Sources

- V8 elements kinds: https://v8.dev/blog/elements-kinds
- V8 Orinoco GC: https://v8.dev/blog/trash-talk
- V8 performance tips: https://web.dev/articles/speed-v8
- Transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- SharedArrayBuffer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
- movegen benchmark (JS / AssemblyScript / Rust-WASM): https://mcarbonell.github.io/chess-movegen-js/
- Sunfish: https://github.com/thomasahle/sunfish · Stockfish: https://github.com/official-stockfish/Stockfish/tree/master/src · Vice: https://github.com/bluefeversoft/vice · Rustic: https://codeberg.org/mvanthoor/rustic · Carp: https://github.com/dede1751/carp · Lozza: https://github.com/op12no2/lozza · Tonnetto: https://github.com/marcobuontempo/tonnetto · chess.js: https://github.com/jhlywa/chess.js
