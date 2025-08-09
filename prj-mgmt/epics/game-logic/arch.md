Think of three boards in a row (Left–Center–Right). They all show the *same* position, but only the center is “real.”

When a piece on the center could make a legal chess move on the left or right copy (even if that move crosses the seam between boards), the piece **uses that side board to path-check** but **teleports to the corresponding square on the center**. So your b1 knight can “reach” **h2** by hopping on the left board; if center h2 is blocked by your pawn, move it to h3 and the knight’s mirror move becomes legal. That’s the core rule.

Below is tight, implementation-ready pseudocode.

# Mirror-Chess move generator (pseudocode)

```
DATA:
  B[8][8]            // center board: piece or empty; white/black info on piece
  SIDE_BOARDS = {L, C, R}  // indexes: -1, 0, +1   (Center = 0)

HELPERS:
  pieceColor(p)
  isEnemy(p, q)
  copyPositionToSideBoards(B):
      // Left and Right are virtual copies used ONLY for path/attack checking
      for s in {-1,0,+1}: S[s] = B.clone()
      return S

  wrapToTriBoard(file, sideIndex):
      // given a possibly out-of-range file and current sideIndex, fold into [-1..+1] x [0..7]
      s = sideIndex
      f = file
      while f < 0:   s -= 1; f += 8
      while f > 7:   s += 1; f -= 8
      if s < -1 or s > +1: return INVALID
      return (s, f)

  raySteps(dFile, dRank):
      // infinite-ray iterator for bishops/rooks/queens
      k = 1
      while true:
         yield (k*dFile, k*dRank)
         k += 1

  knightDeltas = {(±1,±2),(±2,±1)}
  kingDeltas   = {(−1..+1, −1..+1) \ (0,0)}
  rookDirs     = {(1,0),(-1,0),(0,1),(0,-1)}
  bishopDirs   = {(1,1),(1,-1),(-1,1),(-1,-1)}

CORE:
  generateMirrorMoves(B, square s0):
      S = copyPositionToSideBoards(B)
      (f0, r0) = s0
      P = B[r0][f0]
      color = pieceColor(P)

      legalTargets = ∅

      // Treat the tri-board as a stitched 24x8 strip for move *generation*,
      // but map the landing square back to CENTER before finalizing.
      start = (side=0, file=f0, rank=r0)

      GEN(piece P):
         if P is Knight:
            for (df, dr) in knightDeltas:
               tryStep(start, df, dr, singleStep=true)
         else if P is King:
            for (df, dr) in kingDeltas:
               tryStep(start, df, dr, singleStep=true)
         else if P is Bishop/Rook/Queen:
            DIRS = (P is Bishop ? bishopDirs :
                    P is Rook   ? rookDirs   :
                                  bishopDirs ∪ rookDirs)
            for (df1, dr1) in DIRS:
               for (df, dr) in raySteps(df1, dr1):
                  if not tryStep(start, df, dr, singleStep=false): break
         else if P is Pawn:
            dir = (color == White ? +1 : -1)

            // forward 1
            tryPawnForward(start, 0, dir, allowCapture=false)

            // forward 2 from home rank (uses tri-board path check + center landing empty)
            if (r0 == (color==White ? 1 : 6)):
               if tryPawnForward(start, 0, 2*dir, allowCapture=false, needsEmptyThrough=true):
                  /* recorded inside helper */

            // captures (diagonals)
            for df in {-1, +1}:
               tryPawnCapture(start, df, dir)

            // (optional) en passant, promotions handled after mapping; skip for v1

      tryStep(start, df, dr, singleStep):
         (s, f, r) = (start.side, start.file, start.rank)
         (s1, f1) = wrapToTriBoard(f + df, s)
         if INVALID: return false
         r1 = r + dr
         if r1 < 0 or r1 > 7: return false

         // path/occupancy is read from the side boards S
         target = S[s1][r1][f1]

         if target == EMPTY:
            // teleport to center, same (f1,r1)
            if centerSquareFreeOrLegalCapture(B, f1, r1, EMPTY):
               legalTargets += (f1, r1)
            return true    // ray can continue
         else:
            // can capture only if enemy
            if isEnemy(P, target):
               if centerSquareFreeOrLegalCapture(B, f1, r1, targetOnCenter=B[r1][f1]):
                  legalTargets += (f1, r1)
            return false   // ray stops on any occupied square

      centerSquareFreeOrLegalCapture(B, f, r, targetOnCenter):
         // landing must be legal on CENTER board
         if targetOnCenter == EMPTY: return true
         return isEnemy(P, targetOnCenter)

      tryPawnForward(start, df, dr, allowCapture, needsEmptyThrough=false):
         // pawns cannot move if blocked on the SIDE path or center landing
         (s1,f1) = wrapToTriBoard(start.file + df, start.side)
         if INVALID: return
         r1 = start.rank + dr
         if r1<0 or r1>7: return
         // if double push, ensure the through-square is empty on the SIDE strip
         if needsEmptyThrough:
            midRank = start.rank + (dr/2)
            (sm,fm) = wrapToTriBoard(start.file + df, start.side)
            if S[sm][midRank][fm] != EMPTY: return
         if S[s1][r1][f1] != EMPTY: return            // blocked on side path
         if B[r1][f1] != EMPTY: return                // must land on empty center
         legalTargets += (f1, r1)

      tryPawnCapture(start, df, dr):
         (s1,f1) = wrapToTriBoard(start.file + df, start.side)
         if INVALID: return
         r1 = start.rank + dr
         if r1<0 or r1>7: return
         // must have enemy on CENTER (not side) because capture resolves on center
         if B[r1][f1] != EMPTY and isEnemy(P, B[r1][f1]):
             legalTargets += (f1, r1)

      // 1) generate candidate targets using tri-board paths
      GEN(P)

      // 2) filter out moves that leave own king in check.
      legalTargets = {t ∈ legalTargets | not causesSelfCheck(B, s0 -> t)}

      return legalTargets
```

### Notes & edge cases (for v1)

* Only the **center** board changes after a move. Left/Right are re-derived copies each turn.
* Check/checkmate must use the same generator for **attacks**, i.e., an enemy can attack your king via mirror moves.
* You can defer castling, en passant, and promotions to v2.

---

# Example (your screenshot)

* Piece: white knight at **b1**.
* On the *left* copy of the board, the same knight is at **b1** too. Knight L-moves across the stitched seam can land on squares that are on the left board (e.g., **h2** relative to the stitched 24-file strip).
* The move candidate maps back to **center h2**.
* If **center h2** is empty, highlight it. If it has your pawn, you must first move that pawn to **h3**; then the b1→h2 mirror move becomes legal.

---

# Image plan (one per piece)

All images show three boards side-by-side. Left/right at 50% opacity. The selected piece glows on the center; mirror-reachable squares (after teleport mapping) are green on the **center**. Ghost paths are drawn on the faded side where the path was validated.

1. Knight: b1 selected; green dots on **h2, c3, d2, a3, etc.**; a ghost arc shows the hop landing on *left* h2, with a teleport arrow back to center h2.
2. Bishop: c1 selected; ray drawn diagonally onto the *right* board then back to center landing squares.
3. Rook: a1 selected; file ray passes onto left board then teleports back to center a-file targets.
4. Queen: combine rook/bishop visuals.
5. King: one-step neighbors including seam-crossing options via side boards.
6. Pawns: forward single/double (side path must be empty), captures only if the **center** landing square has an enemy. Show a case where forward 2 is blocked on the side board.

Does this align with your intended rules? If yes, I can turn this into TypeScript (clean, testable `generateMirrorMoves`) and draft the first two demo images (knight & bishop).
