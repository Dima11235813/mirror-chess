# Story — A game record: the move list, in notation

> **Status: READY — unblocked 2026-09-22 when notation was adopted** (spec §8.5, the `*`
> seam tag). Part of the [board-interactions epic](../../board-interactions). Unblocks
> [`undo-move.md`](./undo-move.md), which has been waiting on exactly this.

## Summary

As the owner, I want every game to keep a readable move list, so that a game can be
reviewed, shared, resumed and filed as a bug report — and so that undo has something to
undo.

## 1. Nothing records the moves today

The draw rules added *position* history — the keys since the last irreversible move, which
is what repetition detection needs. That is a different thing from the **move sequence**,
and nothing records it. Consequences: no move log, no undo, no export, no way to paste a
game into a bug report.

## 2. Notation, now decided

Spec §8.5: standard SAN with **`*` marking a seam crossing**, placed after the destination
and before the check/mate suffix — `Bb3–h4*`, `Bxh4*+`, `axb6 e.p.*`. An ordinary
all-flags-off game notates as ordinary chess, so a Mirror Chess record **degrades to valid
PGN** when the seam is unused.

Two consequences the implementation must respect:

- **Disambiguation bites more often.** SAN's file-then-rank rule is unchanged, but the seam
  gives two pieces more ways to reach one square. Where a square is reachable both as a
  standard move and as a crossing, dedupe already keeps the standard one (§4), so `*` and
  non-`*` never compete for the same destination.
- **A record is meaningless without its ruleset.** The token travels with the moves, always.

## 3. What is recorded

Per game: the ruleset token, the starting position (FEN — `fen.ts` already exists and is
what a bug report should carry), the move list, the result and its termination reason. That
is deliberately the same shape the self-play harness writes
([`../../balance/self-play-harness.md`](../../balance/self-play-harness.md) §3.5), so one
format serves the player, the study and the lab view — and a self-play game can be opened
in the board UI and replayed.

## 4. Acceptance Criteria

- [ ] Every move played is appended to a move list, in §8.5 notation, with the ply number.
- [ ] Portal moves are visibly marked in the list, and distinguishable **non-visually**.
- [ ] Ambiguous moves disambiguate by SAN's rule; a unit test covers two pieces reaching one
      square, one of them across the seam.
- [ ] Notation round-trips: parsing a recorded game replays it move for move through
      `reduceMove` and reaches the same final position. **Property-tested over generated
      games, not examples** — this is a parser, and parsers fail on the case nobody wrote.
- [ ] A game exports as text carrying its ruleset token, start position and moves; with all
      flags off the export is valid PGN.
- [ ] A recorded game can be loaded back and replayed in the UI.
- [ ] Clicking a move shows that position; the board returns to the live position clearly.
- [ ] The log persists with the saved game, and old saves without a move list still load.

## 5. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/notation.test.ts` | rendering each move kind; disambiguation; the `*` tag; round-trip property test |
| Integration | `src/components/MoveLog.spec.tsx` | list renders, portal marks, click-to-view, a11y names |
| E2E | `prj-mgmt/epics/board-interactions/history/move-log.e2e.ts` | play a game, see the log, export it, reload it |

## Definition of done

A game is a document: rules, start, moves, result — readable by a person, replayable by the
app, and the thing [`undo-move.md`](./undo-move.md) walks backwards through.
