# Story — Draw rules (repetition, 50-move, move limit)

> **Status: DONE (2026-08-04).** Deferred by
> [the Mirror Portal spec](./mirror-portal-spec.md) §10.4 because it needed move history;
> it was blocking the [balance epic](../balance/README.md), since without a termination
> guarantee self-play games never end. Implemented in `src/game/draw-rules.ts`, reported
> by `src/game/status.ts`, proved by `src/game/draw-rules.test.ts`.
>
> **It also overturned one of its own acceptance criteria** — see
> [What the enumeration found](#what-the-enumeration-found).

## Summary

As a player, I want a game that cannot go on forever — drawn by repetition, by the
50-move rule, or by insufficient material — so that games end the way chess games end,
and so that automated play terminates.

## Why it is urgent now

Today the only terminal states are checkmate and stalemate. Two engines with no
progress to make will shuffle indefinitely. Every part of the variant study depends on
games ending, and "hit the move limit" is not a chess result — it is a missing rule.

There is also a **mirror-specific reason to expect more shuffling than usual**: with
the seam open, kings are much harder to corner
([`stepper-portal.md`](./stepper-portal.md) dissolved three mating positions). Draw
detection is likely to matter *more* in this variant than in chess, not less.

## Prerequisite: move history in `GameState`

None of these rules is computable from a position alone. `GameState` needs:

- a **position history** for repetition — positions, not moves, and equality must
  include side to move and (once they exist) castling rights and the en-passant
  square, exactly as chess does;
- a **halfmove clock** for the 50-move rule, reset on a pawn move or a capture;
- and this same history is what [`undo-move.md`](../../epics/board-interactions/history/undo-move.md)
  and any future notation or PGN export need. Design it once, for all three.

**[decision] Where history lives — SETTLED (2026-08-04): in `GameState`, with movegen
reading the narrower `Position`.**

The concern was cost in a search loop. It does not arise, because the split already
existed and was simply not being used: `Position` is `{ board, rules }` and `GameState
extends Position`. Move and attack generation were widened to take `Position`, so the
three new fields — `halfmoveClock`, `history`, `plies` — are invisible to `legalMovesFor`,
`allLegalMoves` and perft. `perft`'s `advance()` does not maintain them, which is not an
optimisation but a *requirement*: perft counts leaves, and a node that stopped early
because the clock expired would undercount against the published chess numbers.

`history` holds **position keys since the last irreversible move**, current position last.
Truncating there is the exact rule rather than a space saving — a capture or pawn move
makes every earlier position unreachable — and it keeps the array short enough that its
size never became a question.

The key itself (`src/game/position-key.ts`) is a readable FEN-style string, **not** a
Zobrist hash. That follows [ADR 0002](../engine/adr/0002-two-implementations-one-oracle.md):
the reference core stays obvious and is the oracle; the engine gets the incremental
Zobrist key behind the same concept. Note the trap recorded there and in
[`search.md`](../engine/research/search.md) — the key excludes the ruleset, which is
correct within a game and fatal if a key-indexed table is ever shared across rulesets.

**Still owed to notation and undo.** This history is *positions*, not *moves*. Undo and a
move log need the move sequence, which nothing records yet. The "design it once" ambition
in the original story was half right: the clock and repetition keys are shared, the move
list is a separate thing.

## Acceptance Criteria

- [x] **Threefold repetition** is a draw; position identity includes side to move.
      Applied **automatically**, not on a claim: there is no claim UI, and self-play needs
      the result to be deterministic rather than dependent on an engine remembering to ask.
- [x] **50-move rule**: 100 halfmoves with no pawn move and no capture is a draw; the
      clock resets correctly on both — including on a capture made *across the seam*.
- [x] **Insufficient material** is a draw for the cases that survive the seam. The
      criterion as originally written was **wrong**, and the enumeration is what caught
      it — see below. What ships is: K vs K always; K+N vs K always; K+B vs K only when
      the bishop cannot capture across the seam; K+B vs K+B on one colour only when the
      bishop cannot cross at all.
- [x] `gameStatus` reports these alongside checkmate and stalemate, and the footer
      announces each distinctly (`Draw — threefold repetition`, `Draw — fifty-move rule`,
      `Draw — insufficient material`). Checkmate is decided **first**, so a mate on the
      hundredth halfmove is a mate.
- [x] A hard **move limit** exists as a backstop for automated play, reported as a
      distinct non-chess outcome so it is never silently counted as a draw:
      `gameStatus(state, { maxPlies })` returns `'move-limit'`, `isGameOver` accepts it
      and `isDraw` rejects it. No limit is applied unless one is passed, so human play is
      unaffected.
- [x] Saved games round-trip whatever history the rules require. A save written before
      this story resumes with a clean slate — clock zero, history holding only the
      restored position — because inventing a clock we never recorded would be inventing
      a game.

## What the enumeration found

The story assumed the chess answers and flagged only the same-coloured-bishops case as
mirror-sensitive. Enumerating every placement of each material under every relevant flag
setting showed the assumption was too narrow:

| Material | Dead position when | Changed from chess? |
| --- | --- | --- |
| K vs K | always | no |
| K+N vs K | always — a knight that wraps the seam still cannot mate | no |
| K+B vs K | `!portalCaptures(B)` | **yes** |
| K+B vs K+B, one colour | `!portalEnabled(B)` | **yes** |

**A lone bishop mates.** `White Ka1, Bd4 — Black Kh8, Black to move` is checkmate. The
bishop checks along the ordinary `d4–h8` diagonal; its *other* diagonal runs `c5, b6, a7`,
steps through the seam onto `h7` and continues to `g8`, covering both flight squares. No
second attacker is involved. "King and minor piece cannot mate" is simply false here.

**The two bishop rows need different gates**, which is the subtle part:

- Row three asks *can this bishop mate?* Mate needs check, and check through the seam
  needs the capture right (spec §12.2, attack follows capture) — so `portalCaptures`. A
  quiet-only bishop crosses but cannot attack across, and no mate exists for it.
- Row four asks *is "same colour" still a property of the game?* A bishop changes square
  colour merely by arriving on the far side, which **either** right permits. Once it can,
  the material is no longer a closed class: the bishops can become opposite-coloured, and
  opposite-coloured bishops mate even in chess. So the gate is the wider `portalEnabled`.
  Measuring row four the way row three is measured would answer the wrong question.

**Both kings must be on the board.** This engine deliberately supports partial positions
with no king (spec §10.2), and an early version adjudicated `w:Na3` as a drawn game —
blanking the board for most single-piece test fixtures in the repo. Guarded and tested.

### Consequence for the study

The [balance epic](../balance/README.md) should expect **fewer draws than chess** in the
flag combinations where the bishop crosses, since a material balance that is dead in chess
is still playable here. That cuts against the expectation recorded above that the mirror
would *raise* the draw rate; both effects are real and only the study will say which wins.

## Test plan — as built

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/draw-rules.test.ts` | repetition, clock reset (including a seam capture), insufficient material, and the enumeration that proves the material table |
| Unit | `src/game/status.test.ts` | the new terminal states, their precedence, and the move limit |
| Unit | `src/shared/ui/status-text.test.ts` | each draw is worded distinctly; the move limit is never worded as a draw |
| Unit | `src/shared/persistence.test.ts` | the history round-trips; pre-draw-rules saves resume cleanly |
| E2E | `prj-mgmt/epics/rules/draw-rules.e2e.ts` | each draw is announced in the footer, and a drawn game accepts no moves |

The enumeration runs in ~24 s and dominates the unit suite. That is deliberate: it is the
only thing standing between this rule and a guess, and the alternative — asserting chess's
answers — is exactly what it disproved.

**Reaching the fifty-move rule in the UI** needs a `&clock=` URL parameter, added
alongside the existing `&board=` and `&rules=`. Playing a hundred halfmoves through the
board is not a test anyone would run.

## Definition of done — met

Games terminate for every chess reason, the halfmove clock and repetition history are
part of the state, and automated play cannot hang.

A drawn game also **stops accepting moves**, which needed a guard in two places rather
than none. Checkmate and stalemate enforce themselves by leaving no legal move; all three
draws leave legal moves on the board, so `reduceMove` refuses them and `BoardView` stops
offering hints. Without both, a drawn game would keep highlighting moves that silently do
nothing.

## Follow-ups this opened

- **Move list for undo / notation** — see the history note above; roadmap items 4 and 5.
- **Fivefold repetition and the 75-move rule** (FIDE's automatic versions) are not
  implemented. With threefold applied automatically they are unreachable, but they become
  relevant if repetition is ever made claimable.
- **Castling rights and the en-passant square must join the position key** when those
  moves land (spec §8.4). Omitting them would make two genuinely different positions
  compare equal and declare draws that are not draws. Noted at the top of
  `src/game/position-key.ts`.
