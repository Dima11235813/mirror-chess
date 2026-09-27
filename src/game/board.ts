import type { Board, Move, Piece } from './types'
import { toIndex } from './coord'
import { capturedSquare, rookTravelFor } from './move'

/**
 * Apply `move` to `board` with no legality check, returning a new board.
 *
 * Shared by the reducer (which validates first) and by legality filtering (which
 * needs the resulting position to ask whether the mover's king is attacked). Keeping
 * it here rather than in `reducer.ts` avoids an import cycle with `moves.ts`.
 *
 * Everything about *how* a move applies comes from its `flag`, through the derivations in
 * `move.ts` — the captured square and the rook's travel. Nothing is read from an optional
 * field, so there is no shape in which this function can be asked to guess.
 *
 * **What does the mirror seam change about it?** Nothing whatsoever, and that is worth
 * knowing: a move that crossed the seam has already resolved to an ordinary pair of
 * squares by the time it arrives here. All the portal complexity lives in generation. The
 * one place the seam could have bitten is the en-passant victim, whose square is derived
 * as "the destination's file, on the capturing pawn's rank" — a formula that stays correct
 * when the two pawns are seven files apart (see `capturedSquare`).
 *
 * @param board Position to read. Never mutated.
 * @param move Move to apply.
 * @returns The resulting board.
 */
export function applyMoveToBoard(board: Board, move: Move): Board {
  const next: (Piece | null)[] = board.slice()

  const victim = capturedSquare(move)
  if (victim) next[toIndex(victim)] = null

  const mover = next[toIndex(move.from)] ?? null
  next[toIndex(move.from)] = null
  next[toIndex(move.to)] = move.promotion && mover
    ? { kind: move.promotion, color: mover.color }
    : mover

  const rook = rookTravelFor(move)
  if (rook) {
    next[toIndex(rook.to)] = next[toIndex(rook.from)] ?? null
    next[toIndex(rook.from)] = null
  }

  return next
}
