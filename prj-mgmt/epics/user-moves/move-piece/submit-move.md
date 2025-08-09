# Submit Move Feature

## Default

By default when a user selects a piece and then clicks on a valid destination square, the piece should move to that square.

## Acceptance Criteria
- After selecting a piece, I can click a valid destination square on the board, then the piece should move to that square.
- If I click an invalid destination square, the piece should not move and remain in its original position.
- The game state should update to reflect the new position of the piece after a valid move.
- The piece should visually move to the new square, and any captured pieces should be removed from the board.
- The turn should switch to the opposing player after a valid move is made.

## Custom

As a user, I want a Settings Gear icon in a button below the board, that has a toggle for "Auto Submit Move" so that I can choose whether moves are submitted automatically or manually.

### Acceptance Criteria
- A Settings Gear icon button should be located below the chess board.
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

