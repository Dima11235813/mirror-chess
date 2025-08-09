# Bishop – Mirror Attack

As a player, when I select a bishop, I want to capture an enemy on the mirror square on the same rank if the rank path is clear so that I can leverage the mirror rule offensively.

## Acceptance Criteria
- Given a bishop at `(f, r)` and an enemy on `(7 - f, r)`, when all squares strictly between them on rank `r` are empty, then the mirror square is highlighted as a capture.
- Given any blocker between the bishop and its mirror on rank `r`, then the mirror capture is not highlighted.
- Given my own piece on `(7 - f, r)`, then no mirror move or capture is highlighted there.

## Notes
- This is the mirror variant of a capture; it relies on the rank path check (unlike knights).
