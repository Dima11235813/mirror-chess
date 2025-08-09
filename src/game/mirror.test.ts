import { describe, it, expect } from 'vitest'
import { initialPosition } from './setup'
import { legalMovesFor } from './moves'
import type { Coord } from './types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('mirror rule', () => {
  it('rook can mirror across empty rank path', () => {
    const s = initialPosition()
    // clear b1..g1 manually (simulate empty path)
    const s2 = { ...s, board: s.board.slice() }
    for (let f = 1; f <= 6; f++) s2.board[1 * 8 + f] = null // row r=1 is pawns; we need rank r=0 path
    for (let f = 1; f <= 6; f++) s2.board[0 * 8 + f] = null // clear between a1..h1
    s2.board[0 * 8 + 7] = null // clear h1 so destination is empty
    const moves = legalMovesFor(s2, c(0,0)) // white rook at a1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(7,0))
  })

  it('rook can extend past mirror on same rank when mirror square empty', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    // Place white rook at g3 (f=6,r=2), clear row, and ensure opposite half empty
    // Clear original pieces on rank r=2 and r=0 as needed, then place rook at g3
    for (let f = 0; f < 8; f++) s2.board[2 * 8 + f] = null
    s2.board[2 * 8 + 6] = { kind: 'R', color: 'white' }
    // Ensure mirror (b3) and beyond (a3) are empty
    s2.board[2 * 8 + 1] = null
    s2.board[2 * 8 + 0] = null
    // It's white's turn by default
    const moves = legalMovesFor(s2, c(6,2))
    const toB3 = moves.find(m => m.special === 'mirror' && m.to.f === 1 && m.to.r === 2)
    const toA3 = moves.find(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 2)
    expect(toB3).toBeTruthy()
    expect(toA3).toBeTruthy()
  })

  it('rook cannot mirror if blocked on rank', () => {
    const s = initialPosition()
    const moves = legalMovesFor(s, c(0,0))
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror).toBeUndefined()
  })

  it('knight portal from b1 lands on g3 (not g1)', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    const moves = legalMovesFor(s2, c(1,0)) // white knight at b1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(6,2)) // portalized to g3
  })
})


