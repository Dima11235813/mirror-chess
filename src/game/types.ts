/** Color of a side. */
export type Color = 'white' | 'black'

/** Files [0..7] left→right (a..h), Ranks [0..7] bottom→top from White's POV. */
export interface Coord { readonly f: number; readonly r: number }

export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'

export interface Piece { readonly kind: Kind; readonly color: Color }

export type Board = ReadonlyArray<Piece | null> // length 64

export interface Move { readonly from: Coord; readonly to: Coord; readonly special?: 'mirror' }

export interface GameState { readonly board: Board; readonly turn: Color; readonly inCheck: boolean }


