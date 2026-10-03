# Story — Draw rules (repetition, 50-move, move limit)

> **Status: DONE (2026-08-04).** Deferred by
> [the Mirror Portal spec](./mirror-portal-spec.md) §10.4 because it needed move history;
> it was blocking the [balance epic](../balance/README.md), since without a termination
> guarantee self-play games never end. Implemented in `src/game/draw-rules.ts`, reported
> by `src/game/status.ts`, proved by `src/game/draw-rules.test.ts`.
>
> **It also overturned one of its own acceptance criteria** — see
> [What the enumeration found](#what-the-enumeration-found).
>
> ⚠️ **Re-measured 2026-10-03, and the overturned criterion was overturned back.** The seam
> crossing was revised ([`diagonal-crossing.md`](./diagonal-crossing.md)) so that a diagonal
> continues as a diagonal, which makes a bishop colour-bound again. Re-running this story's
> own enumerations gave **no mate for K+B vs K under any of the 16 bishop/king flag
> settings**, and none for same-coloured bishops either. Insufficient material is now
> **exactly chess's rule, flag-independent**. The sections below are kept as written, with
> the new answers marked — the contrast is the most useful thing in this file.

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
      criterion as originally written was **wrong**, the enumeration caught it, and then
      on 2026-10-03 the crossing changed and the same enumeration put it back — see below.
      ~~What ships is: K vs K always; K+N vs K always; K+B vs K only when the bishop cannot
      capture across the seam; K+B vs K+B on one colour only when the bishop cannot cross
      at all.~~ **What ships now:** K vs K, K+N vs K, K+B vs K and K+B vs K+B on one colour
      are *all* dead positions under **every** ruleset. `draw-rules.ts` reads no rule flags.
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

| Material | Dead position when (2026-08) | Dead position when (**2026-10-03**) | Changed from chess? |
| --- | --- | --- | --- |
| K vs K | always | always | no |
| K+N vs K | always — a knight that wraps the seam still cannot mate | always | no |
| K+B vs K | `!portalCaptures(B)` | **always** | no, again |
| K+B vs K+B, one colour | `!portalEnabled(B)` | **always** | no, again |

**A lone bishop mated — and no longer does.** `White Ka1, Bd4 — Black Kh8, Black to move`
was checkmate: the bishop checked along the ordinary `d4–h8` diagonal while its *other*
diagonal ran `c5, b6, a7`, stepped through the seam onto `h7` and continued to `g8`,
covering both flight squares. Under the revised crossing that second diagonal runs
`c5, b6, a7 | h8` instead — onto the king's own square — and `g8` and `h7` are the opposite
colour from `d4`, which a colour-bound bishop can never attack. The king walks out; the
position is a check with three flight squares, one of which is `a8`, reached by the king
crossing the seam itself. `draw-rules.test.ts` keeps it, inverted, as the clearest single
illustration of the change.

~~**The two bishop rows need different gates**~~ — **both gates are gone (2026-10-03).**
The reasoning below was correct about the old crossing and is worth keeping, because it is
a good example of a *sound* argument resting on a geometric fact that later moved:

- Row three asks *can this bishop mate?* Mate needs check, and check through the seam
  needs the capture right (spec §12.2, attack follows capture) — so `portalCaptures`. A
  quiet-only bishop crosses but cannot attack across, and no mate exists for it.
- Row four asks *is "same colour" still a property of the game?* A bishop changes square
  colour merely by arriving on the far side, which **either** right permits. Once it can,
  the material is no longer a closed class: the bishops can become opposite-coloured, and
  opposite-coloured bishops mate even in chess. So the gate is the wider `portalEnabled`.
  Measuring row four the way row three is measured would answer the wrong question.

Both premises fail now: a crossing preserves square colour (spec §7), so a bishop neither
reaches the other colour nor mates alone, and `portal*` does not appear in `draw-rules.ts`
at all.

**Both kings must be on the board.** This engine deliberately supports partial positions
with no king (spec §10.2), and an early version adjudicated `w:Na3` as a drawn game —
blanking the board for most single-piece test fixtures in the repo. Guarded and tested.

### Consequence for the study

~~The [balance epic](../balance/README.md) should expect **fewer draws than chess** in the
flag combinations where the bishop crosses, since a material balance that is dead in chess
is still playable here.~~

**Withdrawn 2026-10-03.** That prediction rested entirely on the lone-bishop mate, and the
mate is gone. The counter-prediction stands alone again: **kings that wrap the seam are hard
to corner, so expect *more* draws than chess**, with no measured effect pulling the other
way. The study (`../balance/variant-study.md`) now has one directional hypothesis instead of
two competing ones — which is a weaker, more falsifiable position to be in, and better than
a balance of two effects where one was an artifact.

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
