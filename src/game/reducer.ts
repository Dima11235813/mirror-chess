import type { GameState, Move, Piece } from './types'
import { toIndex, sameCoord } from './coord'
import { legalMovesFor } from './moves'

/** Apply `move` if legal; otherwise return the original state. No side effects. */
export function reduceMove(state: GameState, move: Move): GameState {
  const legal = legalMovesFor(state, move.from)
  const isLegal = legal.some(m => sameCoord(m.to, move.to) && m.special === move.special)
  if (!isLegal) return state
  const fromI = toIndex(move.from)
  const toI = toIndex(move.to)
  const newBoard: (Piece | null)[] = state.board.slice()
  // If this move specifies a captured square (e.g., en passant), clear it first
  if (move.captures) {
    const capI = toIndex(move.captures)
    newBoard[capI] = null
  }
  newBoard[toI] = newBoard[fromI] ?? null
  newBoard[fromI] = null
  const nextTurn = state.turn === 'white' ? 'black' : 'white'
  return { ...state, board: newBoard, turn: nextTurn }
}


