import type { Coord } from './types'

/** Convert coord → board index (0..63). */
export const toIndex = (c: Coord): number => c.r * 8 + c.f

/** Safe equality for coords. */
export const coordEq = (a: Coord | null, b: Coord | null): boolean => !!a && !!b && a.f === b.f && a.r === b.r

export const sameCoord = (a: Coord, b: Coord): boolean => a.f === b.f && a.r === b.r

/** Alphanumeric like "e4". */
export const algebraic = (c: Coord): string => String.fromCharCode(97 + c.f) + (c.r + 1)

/** Parse a coordinate like "e4" into file/rank. Throws on invalid input. */
export const parseAlgebraic = (sq: string): Coord => {
  if (sq.length !== 2) throw new Error(`Invalid square: ${sq}`)
  const fileChar = sq[0].toLowerCase()
  const rankChar = sq[1]
  const f = fileChar.charCodeAt(0) - 97
  const r = Number(rankChar) - 1
  if (!(f >= 0 && f < 8 && r >= 0 && r < 8) || Number.isNaN(r)) {
    throw new Error(`Invalid square: ${sq}`)
  }
  return { f, r }
}

/** True if inside 8x8. */
export const insideBoard = (c: Coord): boolean => c.f >= 0 && c.f < 8 && c.r >= 0 && c.r < 8

/** Mirror across the center vertical axis (files a↔h, b↔g, c↔f, d↔e). */
export const mirrorFile = (c: Coord): Coord => ({ f: 7 - c.f, r: c.r })

/** Iterate all squares (rank major). */
export const forEachSquare = (cb: (c: Coord) => void) => { for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) cb({ f, r }) }


