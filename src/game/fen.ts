import type { Board, CastlingRights, Color, Coord, GameState, Piece, Kind } from './types'
import { algebraic, parseAlgebraic } from './coord'
import { isInCheck } from './attacks'
import { positionKey } from './position-key'
import { DEFAULT_RULES, type RuleSet } from './rules'

/**
 * FEN — Forsyth–Edwards Notation.
 *
 * **What is this?** The standard one-line text form of a chess position: placement, side
 * to move, castling rights, the en-passant square, the halfmove clock, and the move
 * number.
 *
 * **Why is it here?** Because it is how the outside world writes positions down, and this
 * project's single most valuable correctness check is a comparison against the outside
 * world. The published perft suites — Kiwipete and friends — are distributed as FEN, and
 * without a parser they simply cannot be run. It is also what a bug report should contain
 * and what an engine bench suite is written in.
 *
 * **What does the mirror seam change about it?** Nothing about the *format*, and one thing
 * about its meaning. FEN describes a placement; it says nothing about which pieces may
 * cross the seam, so a FEN string alone does not identify a Mirror Chess position — the
 * ruleset must travel beside it. That is why {@link parseFen} takes `rules` as a separate
 * argument rather than inventing a sixth field: a FEN is a *chess* position, and choosing
 * to read it under a mirror ruleset is the caller's decision, not the notation's.
 *
 * This is also exactly what makes the seam a testing asset. Read a published FEN with
 * every portal flag off and our engine must reproduce a number that dozens of independent
 * engines agree on. No amount of unit testing buys that.
 */

/** The standard opening position. */
export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const PIECE_BY_CHAR: Readonly<Record<string, Kind>> = {
  k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P',
}

/** FEN's letters: uppercase is White, lowercase is Black. */
function pieceFromChar(char: string): Piece | null {
  const kind = PIECE_BY_CHAR[char.toLowerCase()]
  if (!kind) return null
  return { kind, color: char === char.toUpperCase() ? 'white' : 'black' }
}

function charFromPiece(piece: Piece): string {
  return piece.color === 'white' ? piece.kind : piece.kind.toLowerCase()
}

/** Parse FEN's placement field into a board. */
function parsePlacement(field: string): Board {
  const board: (Piece | null)[] = Array.from({ length: 64 }, () => null)
  const ranks = field.split('/')
  if (ranks.length !== 8) throw new Error(`FEN placement needs 8 ranks, got ${ranks.length}`)

  // FEN writes rank 8 first; our rank index counts up from White's side.
  for (const [index, row] of ranks.entries()) {
    const rank = 7 - index
    let file = 0
    for (const char of row) {
      if (char >= '1' && char <= '8') {
        file += Number(char)
        continue
      }
      const piece = pieceFromChar(char)
      if (!piece) throw new Error(`Unknown FEN piece "${char}"`)
      if (file > 7) throw new Error(`FEN rank "${row}" overflows the board`)
      board[rank * 8 + file] = piece
      file++
    }
    if (file !== 8) throw new Error(`FEN rank "${row}" describes ${file} files, not 8`)
  }
  return board
}

function parseCastling(field: string): CastlingRights {
  return {
    white: { king: field.includes('K'), queen: field.includes('Q') },
    black: { king: field.includes('k'), queen: field.includes('q') },
  }
}

/**
 * Read a FEN string into a game state.
 *
 * The en-passant square is taken **exactly as written**, including when no capture is
 * actually available. That differs from what `reducer.ts` records during play, and
 * deliberately: a published perft count was produced by an engine that trusted the field,
 * so second-guessing it here would make our numbers disagree with everyone else's for a
 * reason that has nothing to do with correctness.
 *
 * @param fen A FEN string. The halfmove clock and move number may be omitted, as they are
 *   in most published test suites; they default to zero.
 * @param rules Which pieces cross the seam. FEN cannot express this, so it is supplied
 *   separately; defaults to {@link DEFAULT_RULES}.
 * @throws If the placement, side to move or a field is malformed, naming what was wrong.
 */
export function parseFen(fen: string, rules: RuleSet = DEFAULT_RULES): GameState {
  const fields = fen.trim().split(/\s+/)
  const [placement, side, castlingField = '-', epField = '-', clockField = '0'] = fields
  if (!placement || !side) throw new Error(`FEN needs at least a placement and a side: "${fen}"`)
  if (side !== 'w' && side !== 'b') throw new Error(`FEN side to move must be "w" or "b", got "${side}"`)

  const board = parsePlacement(placement)
  const turn: Color = side === 'w' ? 'white' : 'black'
  const castling = parseCastling(castlingField)
  const enPassant: Coord | null = epField === '-' ? null : parseAlgebraic(epField)
  const halfmoveClock = Number.isInteger(Number(clockField)) ? Number(clockField) : 0

  return {
    board,
    turn,
    rules,
    castling,
    enPassant,
    inCheck: isInCheck({ board, rules }, turn),
    halfmoveClock,
    history: [positionKey(board, turn, { castling, enPassant })],
    plies: 0,
  }
}

/**
 * Write a game state as FEN.
 *
 * The move number is always `1`: this engine records plies since the state was created,
 * not since the game began, so any other value would be a guess. Everything a position
 * needs is present; only the game's age is missing.
 *
 * The ruleset is **not** written. A FEN describes a placement, and the variant it is
 * played under travels as a ruleset token (`src/game/rules.ts`) — keeping the two apart is
 * what lets a Mirror Chess position be pasted into an ordinary chess tool.
 */
export function toFen(state: GameState): string {
  let placement = ''
  for (let rank = 7; rank >= 0; rank--) {
    let empties = 0
    for (let file = 0; file < 8; file++) {
      const piece = state.board[rank * 8 + file]
      if (!piece) { empties++; continue }
      if (empties > 0) { placement += empties; empties = 0 }
      placement += charFromPiece(piece)
    }
    if (empties > 0) placement += empties
    if (rank > 0) placement += '/'
  }

  const rights =
    (state.castling.white.king ? 'K' : '') +
    (state.castling.white.queen ? 'Q' : '') +
    (state.castling.black.king ? 'k' : '') +
    (state.castling.black.queen ? 'q' : '')

  return [
    placement,
    state.turn === 'white' ? 'w' : 'b',
    rights === '' ? '-' : rights,
    state.enPassant ? algebraic(state.enPassant) : '-',
    state.halfmoveClock,
    1,
  ].join(' ')
}
