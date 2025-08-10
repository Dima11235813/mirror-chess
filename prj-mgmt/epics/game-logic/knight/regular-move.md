# [Regular Move] Knight Standard Chess Movement

**Summary**
As a Mirror Chess player, I want knights to move according to standard chess rules so that I can use their unique L-shaped movement pattern in addition to mirror abilities.

**Acceptance Criteria**
- [ ] Knight moves in L-shape: 2 squares in one direction, then 1 square perpendicular
- [ ] Knight can jump over any pieces (no path blocking)
- [ ] Knight can move to empty squares
- [ ] Knight can capture enemy pieces
- [ ] Knight cannot move to squares occupied by friendly pieces
- [ ] Knight cannot move outside the board boundaries

**Test Cases**
- [ ] Knight on e4 can move to 8 possible squares: c3, c5, d2, d6, f2, f6, g3, g5
- [ ] Knight can jump over pieces in its path
- [ ] Knight can capture enemy pieces on destination squares
- [ ] Knight cannot move to squares occupied by friendly pieces
- [ ] Knight on edge squares (a1, h8, etc.) has fewer legal moves due to board boundaries

**Implementation Notes**
- Use standard knight delta patterns: [±1, ±2], [±2, ±1]
- Check board boundaries with `insideBoard()` function
- Check destination occupancy and piece color
- No path validation needed (knights jump)

**Related**
- Regular attack: `regular-attack.md`
- Mirror move: `mirror-move.md`
- Mirror attack: `mirror-attack.md`
