import type { Board, GameState, Piece } from './types'

export const emptyBoard = (): Board => Array.from({ length: 64 }, () => null)

const W: Record<string, Piece> = { K: { kind: 'K', color: 'white' }, Q: { kind: 'Q', color: 'white' }, R: { kind: 'R', color: 'white' }, B: { kind: 'B', color: 'white' }, N: { kind: 'N', color: 'white' }, P: { kind: 'P', color: 'white' } }
const B: Record<string, Piece> = { K: { kind: 'K', color: 'black' }, Q: { kind: 'Q', color: 'black' }, R: { kind: 'R', color: 'black' }, B: { kind: 'B', color: 'black' }, N: { kind: 'N', color: 'black' }, P: { kind: 'P', color: 'black' } }

/** Standard chess initial placement. */
export const initialPosition = (): GameState => {
  const b = emptyBoard().slice()
  const place = (f: number, r: number, p: Piece) => { b[r * 8 + f] = p }
  // White
  ;[0,7].forEach(f => place(f, 0, W.R))
  ;[1,6].forEach(f => place(f, 0, W.N))
  ;[2,5].forEach(f => place(f, 0, W.B))
  place(3, 0, W.Q); place(4, 0, W.K)
  for (let f = 0; f < 8; f++) place(f, 1, W.P)
  // Black
  ;[0,7].forEach(f => place(f, 7, B.R))
  ;[1,6].forEach(f => place(f, 7, B.N))
  ;[2,5].forEach(f => place(f, 7, B.B))
  place(3, 7, B.Q); place(4, 7, B.K)
  for (let f = 0; f < 8; f++) place(f, 6, B.P)
  return { board: b, turn: 'white', inCheck: false }
}


