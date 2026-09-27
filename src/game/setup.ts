import type { Board, CastlingRights, GameState, Piece, Color, Kind } from './types'
import { parseAlgebraic } from './coord'
import { isInCheck } from './attacks'
import { positionKey } from './position-key'
import { DEFAULT_RULES, type RuleSet } from './rules'

export const emptyBoard = (): Board => Array.from({ length: 64 }, () => null)

/**
 * Castling rights **derived from the board**: a side holds a right only if its king and
 * that rook are actually standing at home.
 *
 * FEN carries the rights explicitly, and a real parser must honour that. A *position
 * builder* should not: `fromPiecesSpec('w:Ke4,Ra1')` granting a queenside castle would be
 * a right that can never be exercised, and every test fixture would have to remember to
 * clear it. Deriving means a fixture gets castling exactly when it looks like it should.
 */
export function castlingRightsFromBoard(board: Board): CastlingRights {
  const rightsFor = (color: Color): { king: boolean; queen: boolean } => {
    const rank = color === 'white' ? 0 : 7
    const at = (f: number) => board[rank * 8 + f]
    const king = at(4)
    if (!king || king.kind !== 'K' || king.color !== color) return { king: false, queen: false }
    const rookAt = (f: number) => {
      const p = at(f)
      return !!p && p.kind === 'R' && p.color === color
    }
    return { king: rookAt(7), queen: rookAt(0) }
  }
  return { white: rightsFor('white'), black: rightsFor('black') }
}

/**
 * Wrap a board and a turn into a fresh game — clock at zero, castling rights read off the
 * board, no en-passant square, and a repetition history holding just this position.
 *
 * Every constructor goes through here, so no caller can create a state whose history is
 * empty. `history[0]` being the current position is what makes "count occurrences of the
 * last key" the whole of the repetition rule.
 *
 * `enPassant` starts `null` because a starting position has no *previous* move; en
 * passant is a right created by one specific move and expires immediately (spec §13.2).
 */
function startingState(board: Board, turn: Color, rules: RuleSet): GameState {
  const castling = castlingRightsFromBoard(board)
  return {
    board,
    turn,
    rules,
    castling,
    enPassant: null,
    inCheck: isInCheck({ board, rules }, turn),
    halfmoveClock: 0,
    history: [positionKey(board, turn, { castling, enPassant: null })],
    plies: 0,
  }
}

const W: { readonly [K in Kind]: Piece } = {
  K: { kind: 'K', color: 'white' },
  Q: { kind: 'Q', color: 'white' },
  R: { kind: 'R', color: 'white' },
  B: { kind: 'B', color: 'white' },
  N: { kind: 'N', color: 'white' },
  P: { kind: 'P', color: 'white' },
}
const B: { readonly [K in Kind]: Piece } = {
  K: { kind: 'K', color: 'black' },
  Q: { kind: 'Q', color: 'black' },
  R: { kind: 'R', color: 'black' },
  B: { kind: 'B', color: 'black' },
  N: { kind: 'N', color: 'black' },
  P: { kind: 'P', color: 'black' },
}

/**
 * Standard chess initial placement.
 *
 * @param rules Which pieces cross the seam. Defaults to {@link DEFAULT_RULES}.
 */
export const initialPosition = (rules: RuleSet = DEFAULT_RULES): GameState => {
  const b = emptyBoard().slice();
  const place = (f: number, r: number, p: Piece) => { b[r * 8 + f] = p; };

  // White
  for (const f of [0, 7]) place(f, 0, W.R);
  for (const f of [1, 6]) place(f, 0, W.N);
  for (const f of [2, 5]) place(f, 0, W.B);
  place(3, 0, W.Q);
  place(4, 0, W.K);
  for (let f = 0; f < 8; f++) place(f, 1, W.P);

  // Black
  for (const f of [0, 7]) place(f, 7, B.R);
  for (const f of [1, 6]) place(f, 7, B.N);
  for (const f of [2, 5]) place(f, 7, B.B);
  place(3, 7, B.Q);
  place(4, 7, B.K);
  for (let f = 0; f < 8; f++) place(f, 6, B.P);

  return startingState(b, 'white', rules);
};

/**
 * Create a game state from a compact FEN-like piece list.
 * Format: "w:Ka1,Qd1,Ra2; b:Kg8,Qd8,Pg6,..." where sides are optional and
 * piece designators are capital letter kind (KQRBNP) followed by square in algebraic.
 * Turn and rules are provided separately.
 *
 * @param rules Which pieces cross the seam. Defaults to {@link DEFAULT_RULES}.
 */
export function fromPiecesSpec(spec: string, turn: Color = 'white', rules: RuleSet = DEFAULT_RULES): GameState {
  const b = emptyBoard().slice()
  const placePiece = (color: Color, kind: Kind, square: string) => {
    const { f, r } = parseAlgebraic(square)
    b[r * 8 + f] = { kind, color }
  }
  const parts = spec.split(';').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    const [sidePrefix, itemsStr] = part.split(':').map(s => s.trim())
    const color = sidePrefix?.toLowerCase().startsWith('w') ? 'white' : 'black'
    if (!itemsStr) continue
    const items = itemsStr.split(',').map(s => s.trim()).filter(Boolean)
    for (const it of items) {
      const kind = it[0] as Kind
      const sq = it.slice(1)
      placePiece(color, kind, sq)
    }
  }
  return startingState(b, turn, rules)
}


