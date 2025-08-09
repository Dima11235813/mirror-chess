# Pawn – Regular En Passant

As a player, I want orthodox en passant to work for pawns so that standard pawn tactics are supported.

## Acceptance Criteria
- When a pawn advances two squares (e.g., b7→b5 or e2→e4), record an en-passant (EP) opportunity for the immediate next move only.
- If b7→b5 and an enemy pawn sits on a5 or c5, highlight a red capture landing on b6 and, upon execution, remove the pawn from b5.
- If e2→e4 and an enemy pawn sits on d4 or f4, highlight a red capture landing on e3 and, upon execution, remove the pawn from e4.
- EP disappears after any unrelated move.

## Notes
- UI should show EP destinations using the capture (red) hint even if the destination is empty, and also highlight the square of the pawn that will be removed with a translucent red overlay.
- Requires EP state in `GameState`, move generation for EP, and reducer support to remove the captured pawn.

## Related
- Mirror variant: `prj-mgmt/epics/game-logic/pawn/mirror-en-passant.md`.
