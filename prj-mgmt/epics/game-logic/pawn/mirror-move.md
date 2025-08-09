# Pawn – Mirror Move (Not Applicable)

Pawns do not perform same-rank horizontal mirror moves.

## Acceptance Criteria
- Given a pawn at `(f,r)`, the opposite-file same-rank square `(7-f, r)` is never highlighted as a mirror move.
- Horizontal mirror capture on the same rank is not a legal pawn move.

## Rationale
- Pawn movement is directional. Mirror mechanics for pawns are handled via mirror capture projection, not lateral translation.

