# Bishop – Regular Attack

As a player, when I select a bishop, I want to see legal capture squares along diagonals and no squares beyond the first capture so that I can make valid captures.

## Acceptance Criteria
- Given an enemy piece on a diagonal ray, when I select the bishop, then that occupied square is highlighted as a capture.
- Given an enemy piece on a diagonal ray, when I select the bishop, then squares beyond that piece on the same ray are not highlighted.
- Given my own piece on a diagonal ray, when I select the bishop, then that square and any beyond on that ray are not highlighted.

## Notes
- Captures happen on the first occupied square in a ray if it is an enemy piece.
