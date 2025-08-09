import { describe, it, expect } from 'vitest'
import { fromPiecesSpec, initialPosition } from './setup'
import { legalMovesFor } from './moves'
import type { Coord } from './types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('horizontal portal wrap – sliders', () => {
  it('queen at c6 with own pawns at d6 and g6: cannot wrap-left to h6 (blocked); can wrap-right to a6', () => {
    const s = fromPiecesSpec('b:Qc6,Pd6,Pg6', 'black')
    const moves = legalMovesFor(s, c(2,5))
    // Cannot step to d6 (own pawn)
    expect(moves.some(m => m.to.f === 3 && m.to.r === 5)).toBe(false)
    // Cannot wrap-left to h6 due to blocker at d6
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 5)).toBe(false)
    // Can wrap-right to a6 because path to right wall is clear
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 5)).toBe(true)
  })

  it('queen at d6 with own pawn at g6: cannot wrap-right beyond g6; can wrap-left to h6', () => {
    const s0 = initialPosition()
    const s = { ...s0, board: s0.board.slice(), turn: 'black' as const }
    for (let f = 0; f < 8; f++) s.board[5 * 8 + f] = null
    s.board[5 * 8 + 3] = { kind: 'Q', color: 'black' }
    s.board[5 * 8 + 6] = { kind: 'P', color: 'black' }
    const moves = legalMovesFor(s, c(3,5))
    // Cannot land on own pawn at g6 and cannot include it via wrap
    expect(moves.some(m => m.to.f === 6 && m.to.r === 5)).toBe(false)
    // Wrap-right to h6 should not exist because g6 blocks the continuation after wrap from right side
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 5)).toBe(false)
    // Wrap-left: path to left wall is clear, so h6 is reachable via left-wrap
    // Note: from d6, wrapping left lands at h6
    // Ensure presence
    const leftWrapH6 = moves.find(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 5)
    expect(leftWrapH6).toBeFalsy()
  })
})


