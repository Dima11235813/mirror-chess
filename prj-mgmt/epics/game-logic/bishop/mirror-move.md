# Bishop – Mirror Move

As a player, when I select a bishop, I want to see the file-mirror destination on the same rank if the rank path is clear so that I can perform a mirror move per the game rules.

## Acceptance Criteria
- Given a bishop at `(f, r)`, when the squares strictly between `f` and `7 - f` on rank `r` are empty, then the mirror square `(7 - f, r)` is highlighted as a mirror move.
- Given a piece of my own color on the mirror square, then the mirror move is not highlighted.
- Given an enemy piece on the mirror square, then the mirror move is highlighted as a capture.
- Given any blocker on the same rank between the bishop and its mirror file, then the mirror move is not highlighted.

## Notes
- Knights are exempt from path checks; bishops are not. This story covers bishops only.
