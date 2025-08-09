import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { legalMovesFor } from './moves'
import type { Coord } from './types'

const c = (f: number, r: number): Coord => ({ f, r })

// Skipped until EP state exists in GameState and move generation supports mirror EP.
describe.skip('pawn: mirror en passant generation', () => {
  it('White pawn a5 after last move h7->h5: includes mirror EP capture to h7', () => {
    // TODO: once EP state exists, create a state that encodes last move h7->h5
    const s = fromPiecesSpec('w:Pa5; b:Ph5', 'white')
    const moves = legalMovesFor(s, c(0, 4)) // a5 is (0,4)
    // Expectation placeholder: mirror EP to h7 (7,6)
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 6)).toBe(true)
  })

  it('Black pawn h4 after last move a2->a4: includes mirror EP capture to a2', () => {
    // TODO: once EP state exists, create a state that encodes last move a2->a4
    const s = fromPiecesSpec('w:Pa4; b:Ph4', 'black')
    const moves = legalMovesFor(s, c(7, 3)) // h4 is (7,3)
    // Expectation placeholder: mirror EP to a2 (0,1)
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 1)).toBe(true)
  })
})


