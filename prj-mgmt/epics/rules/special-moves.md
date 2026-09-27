# Story — Special moves (promotion, en passant, castling)

> **Status: DONE (2026-08-04).** Resolves the §8.4 deferral. Rules in
> [`mirror-portal-spec.md`](./mirror-portal-spec.md) §13; implementation in
> `src/game/moves.ts`, `src/game/board.ts`, `src/game/reducer.ts`; verified against the
> **published chess perft suite** in `src/game/perft.test.ts`.

## Summary

As a player, I want the three rules chess has that this engine lacked — promotion,
en passant and castling — so that a game can be played from beginning to end and scored
correctly.

## Why it mattered more than "three missing rules"

Promotion was not a rough edge, it was **game-breaking**. A pawn that reached the far rank
had no legal move and became a permanently dead piece. That silently converted saved
positions into losses:

```
White Ka1, Pb8 — Black Kc3, Qb2, White to move  →  'checkmate'
```

White is mated only because the pawn on `b8` is frozen. Promoted, it is a queen and plays
`Qxb2`. Any game in which a pawn promoted was scored wrong.

It was also a prerequisite for the engine, not just for the player: an engine trained
against a game where pawns die on the eighth rank learns the wrong game, and every
pawn-related evaluation term would have been wrong from the start.

## The three confirmed decisions

| Question | Decision | Consequence |
| --- | --- | --- |
| En passant across the seam? | **Yes**, gated on the pawn's capture-across flag | A pawn on `a5` can take one that played `h7–h5` |
| Castling geometry at the seam? | **Unchanged** — the question is unreachable | But a rook or bishop can forbid a castle from the far corner |
| Promotion UI? | **Modal picker, all four pieces** | Under-promotion is a real choice here, not a curiosity |

### En passant is where the seam actually bites

The rule is stated in terms of *attack* — "any pawn that attacks the square the
double-pushing pawn passed over" — which is exactly how chess states it, and it therefore
inherits the wrap from §11.2 **with no clause of its own**. A pawn on `a5` attacks `h6`,
so a double push on the `h`-file can be answered from the `a`-file, and the two pawns
stand seven files apart.

The alternative — allow the attack but forbid the capture — was rejected because it would
be the first place in this engine where attack and capture disagree, which is precisely
the drift §12.7 exists to prevent.

### Castling: the worry turned out to be unreachable

The roadmap flagged that §11 lets a stepper wrap the file, and the king's castling step is
horizontal — so might it wrap? **No.** The squares involved are `b c d e f g` on one rank
and the rook's travel is `a1→d1` / `h1→f1`; none of them is an edge file. The question
cannot arise in the standard game, so §13.3 leaves it **unspecified** rather than
answering it. A rule that cannot be exercised cannot be tested.

What the seam *does* change is who may forbid a castle, and it needed no new rule at all —
only that the three check tests use seam-aware attacks:

> A bishop on `a3` steps through the seam and attacks `h3, g2, f1`. It therefore forbids
> White's **kingside** castle from the opposite corner of the board. Under ordinary chess
> rules the same bishop attacks nothing past `c1` and the castle stands.

A related fact, true from move one: the two home rooks **defend each other through the
seam**, `a1 ↔ h1`. Harmless, and a good canary.

## What this let us finally do: verify against the outside world

Castling, promotion and en passant were the only things standing between this project and
the **published chess perft suite**. With every portal flag off, Mirror Chess *is* chess,
and those numbers have been independently reproduced by dozens of engines. All of them
matched on the first run:

| Position | Depth | Nodes | |
| --- | --- | --- | --- |
| Start | 5 | 4,865,609 | first depth containing en passant (258 of them) |
| Kiwipete | 4 | 4,085,603 | castling both ways, pins, promotion race |
| Position 3 | 5 | 674,624 | en passant and rank pins |
| Position 4 | 4 | 422,333 | promotions, including under-promotion with check |
| Position 5 | 4 | 2,103,487 | promotion next move, castling rights that must survive |

This is the strongest correctness evidence the project has ever had, and it required a
**FEN parser** (`src/game/fen.ts`) — the suite is distributed as FEN and is otherwise
unusable. Note what a FEN *cannot* say: which pieces cross the seam. The ruleset travels
beside it, which is why `parseFen` takes it as a separate argument.

The deep counts are behind `PERFT_DEEP=1 npm run test` — Kiwipete depth 4 takes ~37 s.
Run them after any change to generation, `applyMoveToBoard`, or the castling and
en-passant bookkeeping.

## Done at the same time: the `Move` reshape

[`task-move-shape.md`](../engine/task-move-shape.md) said to sequence that change "before
the engine's move representation is written". Promotion forced `Move` to change anyway, so
it was done here rather than twice:

- A closed `MoveFlag` union; **no optional properties**, so one hidden class instead of
  eight and every consumer monomorphic.
- One factory, `makeMove`.
- The captured square is **derived** (`capturedSquare`), never stored. Its formula —
  the destination's file, on the *capturing pawn's rank* — is what stays correct when an
  en-passant capture crosses the seam.
- `special: 'mirror'` became `crossedSeam`, and stopped being a rule input: `reduceMove`
  matches on destination and promotion piece only.

## A third contract appeared, and it is the right one

`Position` used to be "board + rules". Castling rights and the en-passant square create
moves that the board alone cannot show, so generation needs more than attacks do — and the
split is the one FEN already makes:

| Contract | Adds | Answers |
| --- | --- | --- |
| `Position` | board, rules | what attacks what |
| `MovePosition` | castling rights, en-passant square | what moves exist |
| `GameState` | turn, clock, history | how the game stands |

Attack generation genuinely cannot see castling rights, which makes a whole class of bug
unwritable. Search sees `MovePosition` and never `GameState`, so the draw rules still
cannot leak into a perft count.

## Acceptance Criteria

- [x] A pawn reaching the far rank promotes to Q, R, B or N — generated as **four**
      distinct moves, never one.
- [x] Promotion by capturing **across the seam** works (`a7` → `h8`), and is gated on the
      pawn's capture-across right.
- [x] En passant, including across the seam, with the right expiring after one move.
- [x] The en-passant square is recorded **only when a capture is available**, so
      repetition still works.
- [x] En passant is refused when it exposes the king along a rank — including when the
      punishing ray arrives through the seam, which no chess engine has to consider.
- [x] Castling for both sides and both colours, refused out of / through / into check,
      with rights lost by moving the king, moving a rook, castling, or **having a rook
      captured** — including captured through the seam.
- [x] Castling rights and the en-passant square are part of the position key (§13.4).
- [x] Published chess perft matches at every depth listed above.
- [x] Saved games round-trip the new state; older saves read their rights off the board.
- [x] The promotion picker is a modal with all four pieces, keyboard-reachable and
      `aria-label`led.

## Test plan — as built

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/special-moves.test.ts` | every §13 rule, each seam interaction, FEN |
| Unit | `src/game/perft.test.ts` | the published suite, plus deep counts behind `PERFT_DEEP` |
| E2E | `prj-mgmt/epics/rules/special-moves.e2e.ts` | promotion picker, castling on screen, both seam surprises |

One e2e is worth reading for its own sake: under-promoting to a knight in a bare-king
position ends the game immediately as **insufficient material**. Two rules written a day
apart compose without either knowing about the other.

## Follow-ups

- **Notation** is now the blocker for a move log — and it has more to express than before:
  a castle, a promotion piece, an en-passant capture *and* a seam crossing.
- **Chess960** would make §13.3's unspecified wrapping question reachable. Specify it then,
  not now.
- **A castling rule flag** is not needed yet. Tokens are append-only
  ([ADR 0004](../engine/adr/0004-ruleset-identity-and-tokens.md)), so one can be added
  without invalidating anything if the study ever wants to ask whether castling is worth
  keeping in a game where kings cannot be cornered.
