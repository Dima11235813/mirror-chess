import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { legalMovesFor } from './moves'
import type { Coord } from './types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('bishop: regular moves and captures', () => {
  it('Bc1 on empty board: all diagonals open', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')
    const moves = legalMovesFor(s, c(2, 0))
    const expects: ReadonlyArray<[number, number]> = [
      [3, 1], [4, 2], [5, 3], [6, 4], [7, 5], // NE
      [1, 1], [0, 2], // NW
    ]
    for (const [f, r] of expects) {
      expect(moves.some(m => m.to.f === f && m.to.r === r && !m.special)).toBe(true)
    }
  })

  it('Bc1 with black Pe3: includes e3 capture, excludes beyond (f4,g5,h6)', () => {
    const s = fromPiecesSpec('w:Bc1; b:Pe3', 'white')
    const moves = legalMovesFor(s, c(2, 0))
    // Can go to d2 and capture e3
    expect(moves.some(m => m.to.f === 3 && m.to.r === 1 && !m.special)).toBe(true)
    expect(moves.some(m => m.to.f === 4 && m.to.r === 2 && !m.special)).toBe(true)
    // Cannot go beyond capture
    for (const [f, r] of [[5, 3], [6, 4], [7, 5]] as const) {
      expect(moves.some(m => m.to.f === f && m.to.r === r && !m.special)).toBe(false)
    }
  })
})

describe('bishop: diagonal portal seam moves and captures', () => {
  it('Bc1 diagonal portal reaches a7,b8 on empty board', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')
    const moves = legalMovesFor(s, c(2, 0))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 6)).toBe(true) // a7
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 1 && m.to.r === 7)).toBe(true) // b8
  })

  it('Bc1 diagonal portal can capture enemy on a7 when path to seam is clear', () => {
    const s = fromPiecesSpec('w:Bc1; b:Na7', 'white')
    const moves = legalMovesFor(s, c(2, 0))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 6)).toBe(true)
  })

  it('Bc1 diagonal portal is blocked if a blocker exists before the seam on the ray', () => {
    // Block NE ray before reaching the seam with a white piece at g5 (6,4)
    const s = fromPiecesSpec('w:Bc1,Ng5', 'white')
    const moves = legalMovesFor(s, c(2, 0))
    expect(moves.some(m => m.special === 'mirror' && (m.to.f === 0 && m.to.r === 6))).toBe(false)
    expect(moves.some(m => m.special === 'mirror' && (m.to.f === 1 && m.to.r === 7))).toBe(false)
  })
})


