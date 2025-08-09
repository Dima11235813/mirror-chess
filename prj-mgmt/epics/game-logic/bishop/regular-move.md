# Bishop – Regular Move

As a player, when I select a bishop, I want to see all legal diagonal destination squares so that I can move the bishop along open diagonals.

## Acceptance Criteria
- Given a bishop on a square with no blocking pieces along a diagonal, when I select the bishop, then all empty squares along that diagonal are highlighted.
- Given a blocking piece on a diagonal, when I select the bishop, then the highlight stops at the first occupied square and does not include squares beyond it.
- Given an occupied square by my own piece on a diagonal, when I select the bishop, then the occupied square and any squares beyond it on that ray are not highlighted.

## Notes
- Standard chess movement: diagonals in four directions; cannot jump over pieces; stops at first capture.
