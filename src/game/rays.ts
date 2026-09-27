import type { Board, Coord } from './types'
import { insideBoard, toIndex } from './coord'

/**
 * Ray geometry shared by move generation and attack generation.
 *
 * Both derive from `prj-mgmt/epics/rules/mirror-portal-spec.md` §4 (the portal rule)
 * and §10.1 (attacks), so the geometry lives here and neither module owns it.
 */

/** A ray direction as `(df, dr)` file/rank deltas. */
export type Direction = readonly [number, number]

export const ROOK_DIRECTIONS: readonly Direction[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
export const BISHOP_DIRECTIONS: readonly Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
export const QUEEN_DIRECTIONS: readonly Direction[] = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS]

/** The king steps one square in every queen direction. */
export const KING_DELTAS: readonly Direction[] = QUEEN_DIRECTIONS

export const KNIGHT_DELTAS: readonly Direction[] = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
]

/** File index of the `a`-file (left seam) and the `h`-file (right seam). */
const LEFT_EDGE_FILE = 0
const RIGHT_EDGE_FILE = 7

/** Where a stepper lands after applying an offset, and whether it crossed the seam. */
export interface SteppedSquare {
  readonly to: Coord
  /** True when the offset ran off the `a`/`h` edge and re-entered on the far side. */
  readonly wrapped: boolean
}

/**
 * Apply a stepper's offset, wrapping the file across the seam (spec §11.2).
 *
 * Unlike a slider, a stepper does not pass *through* the portal — it simply lands,
 * so the file of its destination wraps while the rank is whatever its own move
 * dictates. Where the offset stays on the board this is the identity, so standard
 * chess is unchanged.
 *
 * @param from Origin square.
 * @param df File offset; `|df| <= 2` for every stepper, so at most one crossing.
 * @param dr Rank offset.
 * @returns The destination, or `null` when the **rank** leaves the board — ranks
 *   never wrap, there is no top or bottom portal.
 */
export function stepAcrossSeam(from: Coord, df: number, dr: number): SteppedSquare | null {
  const r = from.r + dr
  if (r < 0 || r > 7) return null
  const rawFile = from.f + df
  return { to: { f: (rawFile + 8) % 8, r }, wrapped: rawFile < 0 || rawFile > 7 }
}

/** The slide directions a piece of the given kind uses, or `null` if it is not a slider. */
export function slideDirectionsFor(kind: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'): readonly Direction[] | null {
  switch (kind) {
    case 'B': return BISHOP_DIRECTIONS
    case 'R': return ROOK_DIRECTIONS
    case 'Q': return QUEEN_DIRECTIONS
    default: return null
  }
}

/**
 * The square a ray must pass through to reach the seam: the `a`-file square for a
 * leftward ray, the `h`-file square for a rightward one (spec §3, §4).
 *
 * @returns The edge square when the ray reaches it with an unobstructed path and
 *   finds it empty, otherwise `null` — the ray was blocked, or it left the board
 *   through the top or bottom before ever touching the edge file. A piece already
 *   standing on the edge file is its own portal mouth for that direction.
 */
export function portalMouth(board: Board, from: Coord, df: number, dr: number): Coord | null {
  const edgeFile = df < 0 ? LEFT_EDGE_FILE : RIGHT_EDGE_FILE
  if (from.f === edgeFile) return from

  let f = from.f + df
  let r = from.r + dr
  while (insideBoard({ f, r })) {
    if (board[toIndex({ f, r })]) return null // blocked before, or standing on, the edge square
    if (f === edgeFile) return { f, r }
    f += df
    r += dr
  }
  return null // the ray exited through the top or bottom edge
}
