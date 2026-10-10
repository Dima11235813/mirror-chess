# Submit Move Feature

> **Status: DONE (2026-10-09).** The confirm step lives in `BoardView`, so **both** the
> game board and the puzzle screen inherit it from one implementation. Proved by
> `src/components/BoardView.submit.spec.tsx` and
> [`inspect-and-confirm.e2e.ts`](./inspect-and-confirm.e2e.ts).
>
> **One criterion moved:** this story asked for the gear *below the board*; the owner chose
> the **header** on 2026-10-09, so that it stays reachable from the puzzle and watch
> screens too. See [`../submit-move/submit-mode.md`](../submit-move/submit-mode.md) §1.

## Default

By default when a user selects a piece and then clicks on a valid destination square, the piece should move to that square.

## Acceptance Criteria
- After selecting a piece, I can click a valid destination square on the board, then the piece should move to that square.
- If I click an invalid destination square, the piece should not move and remain in its original position.
- The game state should update to reflect the new position of the piece after a valid move.
- The piece should visually move to the new square, and any captured pieces should be removed from the board.
- The turn should switch to the opposing player after a valid move is made.

## Custom

As a user, I want a Settings Gear icon ~~in a button below the board~~ **in the app header**
(decided 2026-10-09), that has a toggle for "Auto Submit Move" so that I can choose whether
moves are submitted automatically or manually.

### Acceptance Criteria
- [x] ~~A Settings Gear icon button should be located below the chess board.~~ It is in
      the header, beside Puzzles / Watch / theme.
- Clicking the Settings Gear icon should open a settings menu or modal.
- The settings menu should include a toggle option labeled "Auto Submit Move".
- The toggle should have two states: "On" (default) and "Off".
- When "Auto Submit Move" is "On", the default behavior of automatically submitting moves should be enabled.
- When "Auto Submit Move" is "Off", moves should require manual submission via a "Submit Move" button.

## Manual Submit

When "Auto Submit Move" is turned off, after selecting a piece and clicking a valid destination square, the piece should not move immediately. Instead, a "Submit Move" button should appear below the board. The user must click this button to finalize the move. 

## Acceptance Criteria

- When "Auto Submit Move" is turned off, after selecting a piece and clicking a valid destination square, a "Submit Move" button should appear below the board.
- The piece should not move to the new square until the "Submit Move" button is clicked.
- If the user clicks an invalid destination square, the "Submit Move" button should not appear, and the piece should remain in its original position.
- Clicking the "Submit Move" button should move the piece to the new square and update the game state accordingly.



## What we learned

**The confirm step belongs to the board, not to each screen.** It was built inside
`BoardView`, which holds the chosen move and only calls `onMove` when Submit is pressed —
so the puzzle screen, which judges a move the instant it arrives, gained the same
protection by passing one prop through. Had it been built in the shell, the puzzle screen
would have needed its own copy and the two would have drifted.

**While a move waits, the board is read-only.** Tapping elsewhere does nothing — the only
two answers are Submit and Cancel. Allowing a tap to quietly re-target would make the
button a lie, since the bar names the move it is about to play (`e2–e4`, or `b3–h5*` for a
crossing, or `=Q` for a promotion). Naming it is the point: confirming "a move" is not
confirming anything.

**Promotion asks which piece first, then still waits.** Choosing a queen says *which* move,
not that it should be played, so with confirm on the player keeps the last word.
