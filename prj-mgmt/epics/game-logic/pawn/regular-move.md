# Pawn – Regular Move

As a player, I want pawns to advance forward one square (or two from the starting rank) if the path on the tri-board is clear and the center landing is empty.

## Acceptance Criteria
- Given a pawn on its starting rank (white r=1, black r=6), when both the through and landing squares are empty on the side path and landing is empty on center, then the two-square advance is highlighted.
- Given any pawn not on its starting rank, only the single forward step is considered, with the same empty-path and landing constraints.
- Forward moves cannot capture; if the center landing has any piece, the forward move is not highlighted.

## Notes
- Mirrors do not apply to regular forward pawn moves; see mirror variants below.

