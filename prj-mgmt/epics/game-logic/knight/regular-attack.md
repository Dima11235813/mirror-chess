# [Regular Attack] Knight Standard Chess Captures

**Summary**
As a Mirror Chess player, I want knights to capture enemy pieces according to standard chess rules so that I can eliminate threats and gain material advantage through their unique movement pattern.

**Acceptance Criteria**
- [ ] Knight can capture any enemy piece on a reachable square
- [ ] Knight capture follows same L-shaped movement pattern as regular moves
- [ ] Knight cannot capture friendly pieces
- [ ] Knight capture is treated as a regular move (not special: 'mirror')
- [ ] Captured piece is removed from the board

**Test Cases**
- [ ] Knight on e4 can capture enemy pieces on any of its 8 reachable squares
- [ ] Knight cannot capture friendly pieces on reachable squares
- [ ] Knight capture works on edge squares (a1, h8, etc.)
- [ ] Knight can capture multiple enemy pieces in different positions

**Implementation Notes**
- Capture logic is handled in the same `knightMoves` function as regular moves
- Check `t.color !== p.color` to allow captures
- No special capture logic needed - standard move generation handles this
- Captured piece removal is handled by the reducer, not move generation

**Related**
- Regular move: `regular-move.md`
- Mirror move: `mirror-move.md`
- Mirror attack: `mirror-attack.md`
