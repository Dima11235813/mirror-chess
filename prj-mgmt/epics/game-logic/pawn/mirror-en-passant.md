# Pawn – Mirror En Passant

As a player using Mirror Chess rules, I want en passant to work for mirror-projected pawn interactions across the A↔H seam so that edge-file pawn tactics are valid.

## Acceptance Criteria
- When a pawn advances two squares on the A or H file (e.g., h7→h5 or a2→a4), record an en-passant (EP) opportunity for the immediate next move only.
- If h7→h5 and an enemy pawn is on a5, highlight a red capture landing on h7 (mirror EP) that removes the pawn from h5 upon execution.
- If a2→a4 and an enemy pawn is on h4, highlight a red capture landing on a2 that removes the pawn from a4 upon execution.
- EP is available only immediately after the triggering double advance; any other move clears the EP state.
- Orthodox inner-file EP remains supported (e.g., b7→b5 captured from a5 or c5, landing on b6).

## Notes
- Mirror EP lands on the mirror destination square rather than the orthodox intermediary square.
- UI should show EP destinations using the capture (red) hint even if the destination appears empty (orthodox behavior).
- Requires EP state in `GameState` and support in move generation and reducer.

## Related
- Bug report: `prj-mgmt/epics/game-logic/pawn/bug.md` (Mirror En Passant not offered for Pawn @ A5)
- Tests: unit tests in `src/game/` and Playwright e2e specs in this folder.
