import { describe, it, expect } from 'vitest'
import { initialPosition } from '../src/game/setup'
import { legalMovesFor } from '../src/game/moves'
import type { Coord } from '../src/game/types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('mirror rule', () => {
  it('rook can mirror across empty rank path', () => {
    const s = initialPosition()
    // clear b1..g1 manually (simulate empty path)
    const s2 = { ...s, board: s.board.slice() }
    for (let f = 1; f <= 6; f++) s2.board[1 * 8 + f] = null // row r=1 is pawns; we need rank r=0 path
    for (let f = 1; f <= 6; f++) s2.board[0 * 8 + f] = null // clear between a1..h1
    const moves = legalMovesFor(s2, c(0,0)) // white rook at a1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(7,0))
  })

  it('rook cannot mirror if blocked on rank', () => {
    const s = initialPosition()
    const moves = legalMovesFor(s, c(0,0))
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror).toBeUndefined()
  })

  it('knight may mirror regardless of path (but not onto own piece)', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    // Clear g1 so destination is empty (same-color piece would be illegal)
    s2.board[0 * 8 + 6] = null
    const moves = legalMovesFor(s2, c(1,0)) // white knight at b1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(6,0)) // b1 ↔ g1
  })
})


