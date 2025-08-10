/** Color of a side. */
export type Color = 'white' | 'black'

/** Color constants to avoid magic strings */
export const WHITE: Color = 'white'
export const BLACK: Color = 'black'
export const COLORS: readonly [Color, Color] = [WHITE, BLACK] as const

/** Files [0..7] left→right (a..h), Ranks [0..7] bottom→top from White's POV. */
export interface Coord { readonly f: number; readonly r: number }

export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'

export interface Piece { readonly kind: Kind; readonly color: Color }

export type Board = ReadonlyArray<Piece | null> // length 64

/**
 * A single move from one coordinate to another.
 * - `special` marks variant behaviors like mirror or future EP kinds.
 * - `captures` optionally specifies the coordinate of a captured piece when the
 *   captured piece is not located on the destination square (e.g., en passant).
 */
export interface Move {
  readonly from: Coord;
  readonly to: Coord;
  readonly special?: 'mirror';
  readonly captures?: Coord;
}

export interface GameState { readonly board: Board; readonly turn: Color; readonly inCheck: boolean }


