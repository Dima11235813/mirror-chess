import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { legalMovesFor } from './moves'
import type { Coord } from './types'

const c = (f: number, r: number): Coord => ({ f, r })

// Skipped until EP state exists in GameState and move generation supports orthodox EP.
describe.skip('pawn: regular en passant generation', () => {
  it('White pawn a5 after last move b7->b5: includes EP capture to b6 with capture from b5', () => {
    const s = fromPiecesSpec('w:Pa5; b:Pb5', 'white')
    const moves = legalMovesFor(s, c(0, 4)) // a5
    expect(moves.some(m => m.to.f === 1 && m.to.r === 5 && m.captures && m.captures.f === 1 && m.captures.r === 4)).toBe(true)
  })

  it('Black pawn h4 after last move g2->g4: includes EP capture to g3 with capture from g4', () => {
    const s = fromPiecesSpec('w:Pg4; b:Ph4', 'black')
    const moves = legalMovesFor(s, c(7, 3)) // h4
    expect(moves.some(m => m.to.f === 6 && m.to.r === 2 && m.captures && m.captures.f === 6 && m.captures.r === 3)).toBe(true)
  })
})


