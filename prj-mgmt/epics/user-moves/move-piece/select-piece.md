# Select Piece

> **Status: DONE, and one criterion REVERSED (2026-10-09).** Implemented in
> `src/components/BoardView.tsx`; proved by
> [`inspect-and-confirm.e2e.ts`](./inspect-and-confirm.e2e.ts) and
> `src/components/BoardView.preview.spec.tsx`.

As a user, I want to be able to select a piece on the board so that I can move it — **and
to tap a piece I cannot move, to see what it could do.**

## Acceptance Criteria

- [x] I can click on a piece on the board, when I select it, then the piece should be
      highlighted to indicate it is selected.
- [x] If I click on an empty space or outside the board, any selected piece should be
      deselected.
- [x] ~~If I hover over a piece that's not selectable (e.g., an opponent's piece in a
      turn-based game), it should not be highlighted or selectable.~~
      **Reversed by the owner, 2026-10-09:** *"It would be a really good feature if I could
      tap on an enemy piece to see its possible moves."* An opponent's piece **is**
      selectable, and selecting it **previews** what it could do. See §1.
- [x] When I hover or long press on a piece a distinct visual effect should indicate that
      the piece is being hovered over or long pressed.

## 1. Preview — the reversed criterion, in detail

Tapping a piece of the side **not** to move shows its moves, greyed and hollow, and tapping
one of those squares does nothing but clear the selection.

**Preview is about whose piece it is, not about whether the board is live.** The first cut
generalised it to "anything you cannot play right now", which reads nicely and broke two
older guarantees within the hour:

- [`../../rules/draw-rules.e2e.ts`](../../rules/draw-rules.e2e.ts) asserts a drawn game
  offers **no** hints when you tap your own king.
- [`../../opponent/opponent.e2e.ts`](../../opponent/opponent.e2e.ts) asserts the same while
  the engine is thinking.

Both are right: a player must never see markers on the piece they are reaching for, in a
position where nothing can be played. So the rule is the narrow one — and it is also the
one that was actually asked for. A piece of the side to move is never previewed, even when
it cannot be moved.

### Two things the implementation had to get right

1. **En passant must be stripped before previewing.** `legalMovesFor` deliberately does not
   check whose turn it is (`moves.ts`), which is what makes it reusable for hints and
   analysis — but the en-passant square belongs to the side *to move*. Measured with a
   throwaway probe before building: with black having just played `e7–e5`, previewing
   black's `d7` pawn offered `e6 e.p.`, which would capture **black's own pawn**. The
   preview therefore runs against `{ ...state, enPassant: null }`, which is also the honest
   model: that right expires before it could ever be black's turn.
2. **The accessible name changes, not just the colour.** A preview square reads *"could
   move here"* rather than *"legal move"* — CLAUDE.md §7 forbids a visual-only cue, and here
   a visual-only one would tell a screen-reader user that an enemy's move is theirs to play.

## 2. What we learned

**A grey ring is a promise about what a tap will do.** The whole risk of this feature is a
player tapping a previewed square and expecting a move, so the test that matters most is
the one asserting `onMove` is never called — not the one asserting the rings appear.

**King safety applies to the previewed side too, and it is not obvious.** A test asserting
the black king could step to `d8` failed, and the preview was right: a white bishop on `c1`
attacks `d8` **through the seam**. Hand-picked squares in a seam variant are a bad bet; the
test now asserts the shape of the answer and leaves the geometry to the engine.
