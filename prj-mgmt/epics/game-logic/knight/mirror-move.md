# [Mirror Move] Knight Mirror Projection Movement

**Summary**
As a Mirror Chess player, I want knights to be able to mirror across the file seam to the opposite side of the board, regardless of any pieces blocking the path, so that I can access strategic positions that would be impossible in standard chess.

**Acceptance Criteria**
- [ ] Knight can mirror from any square to its file-mirror on the same rank
- [ ] Knight mirror move ignores all path blockers (knights jump)
- [ ] Knight can mirror to empty squares
- [ ] Knight mirror move is marked with `special: 'mirror'`
- [ ] Knight cannot mirror to squares occupied by friendly pieces
- [ ] Knight mirror works from edge squares (a3 → h3, h6 → a6)

**Test Cases**
- [ ] Knight on a3 can mirror to h3 (empty square)
- [ ] Knight on h6 can mirror to a6 (empty square)
- [ ] Knight on e4 can mirror to d4 (empty square)
- [ ] Knight mirror works regardless of pieces between source and destination
- [ ] Knight cannot mirror to squares occupied by friendly pieces
- [ ] Knight mirror move has `special: 'mirror'` property

**Implementation Notes**
- Use `mirrorFile()` function to calculate destination: `{ f: 7 - from.f, r: from.r }`
- Check `insideBoard(mirror)` to ensure destination is valid
- Check destination occupancy: `!t || t.color !== piece.color`
- Mark move with `special: 'mirror'`
- No path validation needed (knights jump over blockers)

**Related**
- Regular move: `regular-move.md`
- Regular attack: `regular-attack.md`
- Mirror attack: `mirror-attack.md`

**Bug Fix Required**
- Current implementation has issue with edge square mirroring (a3 → h3 not working)
- Need to ensure `mirrorFile()` correctly handles edge cases
