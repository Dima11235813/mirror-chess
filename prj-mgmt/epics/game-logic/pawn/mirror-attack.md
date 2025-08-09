# Pawn – Mirror Attack (Projection)

As a player, when I select a pawn, I want to see a mirror capture candidate on the opposite file of the promotion rank if an enemy piece occupies that destination on the center board.

## Acceptance Criteria
- Given a white pawn at `(f,r)`, check square `(7 - f, 7)`. If an enemy occupies it on center, highlight it as a red capture with `special: 'mirror'`.
- Given a black pawn at `(f,r)`, check square `(7 - f, 0)`. If an enemy occupies it on center, highlight it as a red capture with `special: 'mirror'`.
- Do not highlight any mirror capture if the target promotion-rank square is empty or has an own-color piece.
- Never highlight lateral `(7-f, r)` for pawns.

## Notes
- The path check occurs conceptually on a side board per tri-board rules, but resolution happens on the center. For v0.1, we only gate on center occupancy at the mirror-projected landing.

