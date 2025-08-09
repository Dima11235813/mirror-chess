import type { Board, Coord, GameState, Move, Piece } from './types'
import { toIndex, insideBoard, mirrorFile } from './coord'

/**
 * LEGAL MOVE GENERATION (minimal v0.1):
 * - Standard pseudo-legal moves for each piece (no castling/en passant yet).
 * - Mirror rule: A piece may also move to the exact file-mirror of its current square IF:
 *   - Path across the rank between from and mirror is unobstructed (sliding rule),
 *   - EXCEPTION: Knights may mirror regardless of intervening pieces (they jump),
 *   - Destination must be empty or contain opponent piece.
 */

export function legalMovesFor(state: GameState, from: Coord): Move[] {
  const piece = state.board[toIndex(from)]
  if (!piece || piece.color !== state.turn) return []
  const acc: Move[] = []
  switch (piece.kind) {
    case 'P': pushAll(acc, pawnMoves(state, from, piece)); break
    case 'N': pushAll(acc, knightMoves(state, from, piece)); break
    case 'B': pushAll(acc, slideMoves(state, from, piece, [ [1,1], [1,-1], [-1,1], [-1,-1] ])); break
    case 'R':
      // Standard rook slides
      pushAll(acc, slideMoves(state, from, piece, [ [1,0], [-1,0], [0,1], [0,-1] ]))
      // Horizontal portal wrap (left/right walls only)
      pushAll(acc, horizontalPortalWrap(state, from, piece))
      break
    case 'Q':
      // Standard queen slides
      pushAll(acc, slideMoves(state, from, piece, [ [1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1] ]))
      // Horizontal portal wrap (left/right walls only)
      pushAll(acc, horizontalPortalWrap(state, from, piece))
      break
    case 'K': pushAll(acc, kingMoves(state, from, piece)); break
  }
  // Knight portal — keep special behavior independent of slider wrap
  if (piece.kind === 'N') {
    const mirror = mirrorFile(from)
    if (!sameSquare(mirror, from)) {
      for (const dr of [-2, 2] as const) {
        const to: Coord = { f: mirror.f, r: from.r + dr }
        if (!insideBoard(to)) continue
        const t = state.board[toIndex(to)]
        if (!t || t.color !== piece.color) acc.push({ from, to, special: 'mirror' })
      }
    }
  }
  return acc
}

function pushAll<T>(out: T[], xs: T[]): void { for (const x of xs) out.push(x) }
function sameSquare(a: Coord, b: Coord): boolean { return a.f === b.f && a.r === b.r }

function pawnMoves(state: GameState, from: Coord, p: Piece): Move[] {
  const dir = p.color === 'white' ? 1 : -1
  const startRank = p.color === 'white' ? 1 : 6
  const res: Move[] = []
  const fwd: Coord = { f: from.f, r: from.r + dir }
  if (insideBoard(fwd) && !state.board[toIndex(fwd)]) res.push({ from, to: fwd })
  const fwd2: Coord = { f: from.f, r: from.r + 2 * dir }
  if (from.r === startRank && !state.board[toIndex(fwd)] && !state.board[toIndex(fwd2)]) res.push({ from, to: fwd2 })
  for (const df of [-1, 1]) {
    const cap: Coord = { f: from.f + df, r: from.r + dir }
    if (insideBoard(cap)) {
      const t = state.board[toIndex(cap)]
      if (t && t.color !== p.color) res.push({ from, to: cap })
    }
  }
  return res
}

function knightMoves(state: GameState, from: Coord, p: Piece): Move[] {
  const deltas: ReadonlyArray<[number, number]> = [
    [1, 2], [2, 1], [2, -1], [1, -2],
    [-1, -2], [-2, -1], [-2, 1], [-1, 2]
  ]
  const res: Move[] = []
  for (const [df, dr] of deltas) {
    const to: Coord = { f: from.f + df, r: from.r + dr }
    if (!insideBoard(to)) continue
    const t = state.board[toIndex(to)]
    if (!t || t.color !== p.color) res.push({ from, to })
  }
  return res
}

function kingMoves(state: GameState, from: Coord, p: Piece): Move[] {
  const res: Move[] = []
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (df === 0 && dr === 0) continue
    const to: Coord = { f: from.f + df, r: from.r + dr }
    if (!insideBoard(to)) continue
    const t = state.board[toIndex(to)]
    if (!t || t.color !== p.color) res.push({ from, to })
  }
  return res
}

function slideMoves(state: GameState, from: Coord, p: Piece, dirs: Array<[number, number]>): Move[] {
  const res: Move[] = []
  const board = state.board
  for (const [df, dr] of dirs) {
    let f = from.f + df, r = from.r + dr
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const to: Coord = { f, r }
      const t = board[toIndex(to)]
      if (!t) res.push({ from, to })
      else { if (t.color !== p.color) res.push({ from, to }); break }
      f += df; r += dr
    }
  }
  return res
}

/** True if every square strictly between a and b on the same rank is empty. */
function rankPathClear(board: Board, a: Coord, b: Coord): boolean {
  if (a.r !== b.r) return false
  const lo = Math.min(a.f, b.f) + 1
  const hi = Math.max(a.f, b.f) - 1
  for (let f = lo; f <= hi; f++) if (board[a.r * 8 + f]) return false
  return true
}

/**
 * Horizontal portal wrap for sliders (R, Q):
 * If a piece can slide horizontally all the way to a wall without encountering a blocker
 * in that direction, it may "portal" to the opposite wall and continue sliding in the
 * same direction. All squares reached after the wrap are emitted as moves with
 * special: 'mirror'. At most one wrap is allowed per move generation.
 */
function horizontalPortalWrap(state: GameState, from: Coord, p: Piece): Move[] {
  if (p.kind !== 'R' && p.kind !== 'Q') return []
  const res: Move[] = []
  const board = state.board
  for (const df of [-1, 1] as const) {
    // Walk towards the wall
    let f = from.f + df
    let blocked = false
    while (f >= 0 && f < 8) {
      const t = board[from.r * 8 + f]
      if (t) { blocked = true; break }
      f += df
    }
    if (blocked) continue
    // We hit the wall (stepped outside). Wrap once.
    const wrappedStartF = df === -1 ? 7 : 0
    let wf = wrappedStartF
    while (wf >= 0 && wf < 8) {
      const to: Coord = { f: wf, r: from.r }
      const t = board[toIndex(to)]
      if (!t) { res.push({ from, to, special: 'mirror' }); wf += df; continue }
      if (t.color !== p.color) res.push({ from, to, special: 'mirror' })
      break
    }
  }
  return res
}


