import type { GameState, Move } from './types'
import { toIndex, sameCoord } from './coord'
import { legalMovesFor } from './moves'

/** Apply `move` if legal; otherwise return the original state. No side effects. */
export function reduceMove(state: GameState, move: Move): GameState {
  const legal = legalMovesFor(state, move.from)
  const isLegal = legal.some(m => sameCoord(m.to, move.to) && m.special === move.special)
  if (!isLegal) return state
  const next = structuredClone(state)
  const fromI = toIndex(move.from), toI = toIndex(move.to)
  next.board[toI] = next.board[fromI]
  next.board[fromI] = null
  next.turn = state.turn === 'white' ? 'black' : 'white'
  // TODO: inCheck detection, captures already handled by overwrite
  return next
}


