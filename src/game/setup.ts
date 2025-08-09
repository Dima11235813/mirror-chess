import type { Board, GameState, Piece, Color, Kind } from './types'
import { parseAlgebraic } from './coord'

export const emptyBoard = (): Board => Array.from({ length: 64 }, () => null)

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

/** Standard chess initial placement. */
export const initialPosition = (): GameState => {
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

  return { board: b, turn: 'white', inCheck: false };
};

/**
 * Create a game state from a compact FEN-like piece list.
 * Format: "w:Ka1,Qd1,Ra2; b:Kg8,Qd8,Pg6,..." where sides are optional and
 * piece designators are capital letter kind (KQRBNP) followed by square in algebraic.
 * Turn is provided separately.
 */
export function fromPiecesSpec(spec: string, turn: Color = 'white'): GameState {
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
  return { board: b, turn, inCheck: false }
}


