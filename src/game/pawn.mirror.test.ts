import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { legalMovesFor } from './moves'
import type { Coord } from './types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('pawn mirror projection', () => {
  it('white pawn A4: shows A5, no H4, red capture on H5 when enemy there', () => {
    // Base position without enemy on h8
    const s0 = fromPiecesSpec('w:Pa4', 'white')
    let moves = legalMovesFor(s0, c(0,3))
    // A5 forward present
    expect(moves.some(m => m.to.f === 0 && m.to.r === 4 && !m.special)).toBe(true)
    // No lateral mirror to h4
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 3)).toBe(false)
    // No mirror capture to h5 without enemy
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 4)).toBe(false)

    // Add enemy rook on h5 -> mirror capture should appear
    const s1 = { ...s0, board: s0.board.slice() }
    s1.board[4 * 8 + 7] = { kind: 'R', color: 'black' }
    moves = legalMovesFor(s1, c(0,3))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 4)).toBe(true)
  })

  it('black pawn H5: shows H4, no A5, red capture on A4 when enemy there', () => {
    // Base position without enemy on a1
    const s0 = fromPiecesSpec('b:Ph5', 'black')
    let moves = legalMovesFor(s0, c(7,4))
    // H4 forward present for black
    expect(moves.some(m => m.to.f === 7 && m.to.r === 3 && !m.special)).toBe(true)
    // No lateral mirror to a5
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 4)).toBe(false)
    // No mirror capture to a4 without enemy
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 3)).toBe(false)

    // Add enemy rook on a4 -> mirror capture should appear
    const s1 = { ...s0, board: s0.board.slice() }
    s1.board[3 * 8 + 0] = { kind: 'R', color: 'white' }
    moves = legalMovesFor(s1, c(7,4))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 3)).toBe(true)
  })
})


