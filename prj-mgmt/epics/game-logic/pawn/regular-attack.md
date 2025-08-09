# Pawn – Regular Attack

As a player, I want pawns to capture diagonally forward one square on the center board when an enemy occupies that square.

## Acceptance Criteria
- Given a white pawn at `(f,r)`, if an enemy occupies `(f±1, r+1)` on the center, highlight it as a capture.
- Given a black pawn at `(f,r)`, if an enemy occupies `(f±1, r-1)` on the center, highlight it as a capture.
- Do not highlight diagonal squares without an enemy on center.

## Notes
- This is standard chess capture behavior and is independent of mirror mechanics.

