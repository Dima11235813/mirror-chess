import type { CastlingRights, Color, Coord, GameState, Move, Position } from './types'
import { sameCoord, toIndex } from './coord'
import { applyMoveToBoard } from './board'
import { capturedSquare, pawnDirection } from './move'
import { portalCaptures } from './rules'

/**
 * ADVANCING A POSITION — the bookkeeping every walker of the game tree shares.
 *
 * **What is this?** Given a position and a legal move, what are the castling rights and
 * the en-passant square afterwards? Plus {@link advancePosition}, the cheap "next node"
 * used by anything that enumerates rather than plays.
 *
 * **Why is it here?** Because three callers need it — the reducer, perft, and the engine's
 * search — and the rules it implements are the ones with the most famous bugs in them
 * ("castling rights not cleared when a rook is captured"). Three copies of that would
 * drift, and a drift here is invisible until a perft count is wrong by a few dozen nodes
 * at depth 5.
 *
 * **What does the mirror seam change about it?** One thing, twice, and both are about
 * *who can reach what*:
 *
 * - A rook can be **captured on its corner from the far side of the board** — a bishop
 *   on `a3` reaches `h1` through the seam — so the rights update must key on the corner
 *   square changing hands, never on where the capturer came from.
 * - Whether an en-passant capture is available depends on a pawn's *capture* geometry,
 *   which wraps (spec §13.2). A pawn on `a5` can answer a double push on the `h`-file, so
 *   "is there a capturer" cannot be answered by looking at adjacent files.
 */

/** The corner squares whose occupant, once moved or captured, forfeits a castle. */
const ROOK_CORNERS: readonly {
  readonly square: Coord
  readonly color: Color
  readonly side: 'king' | 'queen'
}[] = [
  { square: { f: 0, r: 0 }, color: 'white', side: 'queen' },
  { square: { f: 7, r: 0 }, color: 'white', side: 'king' },
  { square: { f: 0, r: 7 }, color: 'black', side: 'queen' },
  { square: { f: 7, r: 7 }, color: 'black', side: 'king' },
]

/**
 * Castling rights after `move`.
 *
 * Three ways to lose one, and the third is the one engines forget:
 *
 * 1. The king moves — including *by castling* — and loses both.
 * 2. A rook moves off its corner and loses that side.
 * 3. **A rook is captured on its corner**, which costs the *other* player's right without
 *    that player having touched anything.
 *
 * Cases 2 and 3 are both "the corner square changed hands", so one rule covers them; two
 * rules could disagree.
 */
export function castlingAfter(state: GameState, move: Move): CastlingRights {
  const mover = state.board[toIndex(move.from)]
  const victim = capturedSquare(move)
  const next = {
    white: { ...state.castling.white },
    black: { ...state.castling.black },
  }

  if (mover?.kind === 'K') {
    next[mover.color].king = false
    next[mover.color].queen = false
  }
  for (const corner of ROOK_CORNERS) {
    const vacated = sameCoord(move.from, corner.square)
    const taken = victim !== null && sameCoord(victim, corner.square)
    if (vacated || taken) next[corner.color][corner.side] = false
  }
  return next
}

/**
 * The square a double push passed over, or `null` if `move` was not one.
 *
 * The **raw** form, recorded whether or not anyone can capture onto it. This is FEN's
 * convention and the one published perft counts were produced under, so enumeration must
 * use it: second-guessing the field would make our numbers disagree with everyone else's
 * for a reason unrelated to correctness.
 */
export function enPassantSquareAfter(state: GameState, move: Move): Coord | null {
  if (move.flag !== 'doublePush') return null
  const mover = state.board[toIndex(move.from)]
  if (!mover) return null
  return { f: move.to.f, r: move.to.r - pawnDirection(mover.color) }
}

/**
 * The en-passant square after `move`, recorded **only when a capture is available**.
 *
 * The form a *game* uses (spec §13.4). The availability test is not an optimisation: an
 * en-passant square nobody can use would make two positions that differ in nothing
 * observable compare unequal, and a repetition that really occurred would go unnoticed.
 *
 * @param after The board **after** the move, plus the rules — the capturer must be looked
 *   for in the resulting position, not the previous one.
 */
export function availableEnPassantAfter(state: GameState, move: Move, after: Position): Coord | null {
  const square = enPassantSquareAfter(state, move)
  if (!square) return null

  const mover = state.board[toIndex(move.from)]
  if (!mover) return null
  const enemy: Color = mover.color === 'white' ? 'black' : 'white'
  return anyPawnAttacks(after, square, enemy, move.to.r) ? square : null
}

/**
 * Is `square` reachable by a capture from some pawn of `color` standing on `rank`?
 *
 * Restricted to the one rank a capturing pawn could stand on — the rank the double-pushed
 * pawn came to rest on. Walks *back* from the target along the two capture diagonals of a
 * `color` pawn, so a wrapped diagonal counts exactly when the ruleset allows it and the
 * seam needs no special case.
 */
function anyPawnAttacks(position: Position, square: Coord, color: Color, rank: number): boolean {
  // A `color` pawn on `rank` capturing onto `square` must have advanced one rank to do it.
  if (square.r - pawnDirection(color) !== rank) return false

  for (const df of [-1, 1]) {
    const rawFile = square.f + df
    const wrapped = rawFile < 0 || rawFile > 7
    if (wrapped && !portalCaptures(position.rules, 'P')) continue
    const candidate = position.board[toIndex({ f: (rawFile + 8) % 8, r: rank })]
    if (candidate && candidate.kind === 'P' && candidate.color === color) return true
  }
  return false
}

/**
 * The position after `move`, for **enumeration** — perft and search.
 *
 * Maintains everything that changes which moves exist: the board, the turn, castling
 * rights and the en-passant square. Deliberately does **not** maintain `inCheck`, the
 * halfmove clock, the repetition history or the ply count.
 *
 * That omission is required, not merely cheap. **Perft counts leaves, and the draw rules
 * must never reach it**: a node that stopped early because the clock expired would
 * undercount, and the published chess numbers assume no such adjudication. Search inherits
 * the same property, which is why a search cannot accidentally adjudicate either. Anything
 * that needs accurate game state should go through `reduceMove`.
 */
export function advancePosition(state: GameState, move: Move): GameState {
  return {
    ...state,
    board: applyMoveToBoard(state.board, move),
    turn: state.turn === 'white' ? 'black' : 'white',
    castling: castlingAfter(state, move),
    enPassant: enPassantSquareAfter(state, move),
    inCheck: false,
  }
}
