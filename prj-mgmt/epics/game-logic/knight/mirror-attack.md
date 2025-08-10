# [Mirror Attack] Knight Mirror Projection Captures

**Summary**
As a Mirror Chess player, I want knights to be able to capture enemy pieces through mirror projection across the file seam, regardless of any pieces blocking the path, so that I can eliminate threats and gain material advantage from unexpected angles.

**Acceptance Criteria**
- [ ] Knight can mirror-capture enemy pieces on the opposite side of the board
- [ ] Knight mirror capture ignores all path blockers (knights jump)
- [ ] Knight mirror capture is marked with `special: 'mirror'`
- [ ] Knight cannot mirror-capture friendly pieces
- [ ] Knight mirror capture works from edge squares (a3 → h4, h6 → a5)
- [ ] Mirror capture destination must contain enemy piece

**Test Cases**
- [ ] Knight on a3 can mirror-capture enemy piece on h4
- [ ] Knight on h6 can mirror-capture enemy piece on a5
- [ ] Knight on e4 can mirror-capture enemy piece on d4
- [ ] Knight mirror capture works regardless of pieces between source and destination
- [ ] Knight cannot mirror-capture friendly pieces
- [ ] Knight mirror capture has `special: 'mirror'` property
- [ ] Knight cannot mirror to empty squares (must be enemy piece for capture)

**Implementation Notes**
- Use `mirrorFile()` function to calculate destination: `{ f: 7 - from.f, r: from.r }`
- Check `insideBoard(mirror)` to ensure destination is valid
- Check destination occupancy: `t && t.color !== piece.color` (must be enemy piece)
- Mark move with `special: 'mirror'`
- No path validation needed (knights jump over blockers)

**Related**
- Regular move: `regular-move.md`
- Regular attack: `regular-attack.md`
- Mirror move: `mirror-move.md`

**Bug Fix Required**
- Current implementation has issue with edge square mirror capturing (a3 → h4 not working)
- Need to ensure `mirrorFile()` correctly handles edge cases
- Need to distinguish between mirror moves (empty) and mirror captures (enemy piece)
