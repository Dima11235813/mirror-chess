import type { Color, GameState, Move } from './types'
import { toIndex, sameCoord } from './coord'
import { applyMoveToBoard } from './board'
import { isInCheck } from './attacks'
import { legalMovesFor } from './moves'
import { drawnBy } from './draw-rules'
import { positionKey } from './position-key'
import { availableEnPassantAfter, castlingAfter } from './advance'
import { isCapture } from './move'

/**
 * Apply `move` if it is legal for the side to move; otherwise return `state`
 * unchanged. Pure — no side effects, no mutation.
 *
 * Legality is whatever {@link legalMovesFor} allows, which since spec §10.3 excludes
 * any move leaving the mover's own king attacked. Checkmate and stalemate therefore
 * need no special handling here: a side with no legal move has every move rejected.
 *
 * The **draws** do need handling, and this is the only place that can do it. Unlike mate
 * and stalemate they leave legal moves on the board, so nothing else stops a player
 * continuing a game the rules have already ended. The guard uses `drawnBy`, every part of
 * which is decidable without generating a move.
 *
 * @param state Game to read. Never mutated.
 * @param move Move to apply; matched against the generated moves by destination and
 *   promotion piece. `crossedSeam` is deliberately **not** part of the match — it is
 *   presentation, and dedupe already guarantees at most one move per destination.
 * @returns The new state with the turn passed, `inCheck` recomputed for the side now to
 *   move, and the history, clock, castling rights and en-passant square advanced — or the
 *   original `state` if the move was not legal or the game is already drawn.
 */
export function reduceMove(state: GameState, move: Move): GameState {
  const piece = state.board[toIndex(move.from)]
  if (!piece || piece.color !== state.turn) return state
  if (drawnBy(state)) return state

  const legal = legalMovesFor(state, move.from)
  const chosen = legal.find(m => sameCoord(m.to, move.to) && m.promotion === move.promotion)
  if (!chosen) return state

  const board = applyMoveToBoard(state.board, chosen)
  const turn: Color = state.turn === 'white' ? 'black' : 'white'
  const castling = castlingAfter(state, chosen)
  const enPassant = availableEnPassantAfter(state, chosen, { board, rules: state.rules })
  const key = positionKey(board, turn, { castling, enPassant })
  // An irreversible move makes every earlier position unreachable, so the repetition
  // history restarts rather than growing — that is the rule, not a space optimisation.
  const irreversible = piece.kind === 'P' || isCapture(chosen)

  return {
    ...state,
    board,
    turn,
    castling,
    enPassant,
    inCheck: isInCheck({ board, rules: state.rules }, turn),
    halfmoveClock: irreversible ? 0 : state.halfmoveClock + 1,
    history: irreversible ? [key] : [...state.history, key],
    plies: state.plies + 1,
  }
}
