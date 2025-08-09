import { describe, it, expect } from 'vitest'
import { initialPosition, fromPiecesSpec } from './setup'
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

  it('knight mirror from b1 lands on g1 (same rank)', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    // clear g1 for mirror capture/landing validation
    s2.board[0 * 8 + 6] = null
    const moves = legalMovesFor(s2, c(1,0)) // white knight at b1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(6,0)) // mirrored to g1
  })

  it('bishop can mirror across empty rank path', () => {
    // Updated: bishops do diagonal seam-portal, not same-rank mirror.
    // Place a white bishop at c1 on an otherwise empty board; expect seam-wrapped squares like h4.
    const s0 = initialPosition()
    const s = { ...s0, board: s0.board.slice() }
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) s.board[r * 8 + f] = null
    s.board[0 * 8 + 2] = { kind: 'B', color: 'white' } // c1
    const moves = legalMovesFor(s, c(2, 0))
    // h4 (f=7,r=3) is only reachable via diagonal portal wrap
    const h4 = moves.find(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 3)
    expect(h4).toBeTruthy()
  })

  it('king mirrors to opposite file if destination not own piece', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    // Clear rank r=3 and place a white king at d4 (f=3,r=3)
    for (let f = 0; f < 8; f++) s2.board[3 * 8 + f] = null
    s2.board[3 * 8 + 3] = { kind: 'K', color: 'white' }
    // Destination e4 (f=4,r=3) empty → allowed
    let moves = legalMovesFor(s2, c(3,3))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 4 && m.to.r === 3)).toBe(true)
    // If own piece on e4, mirror not allowed
    s2.board[3 * 8 + 4] = { kind: 'P', color: 'white' }
    moves = legalMovesFor(s2, c(3,3))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 4 && m.to.r === 3)).toBe(false)
  })

  it('pawn can mirror horizontally across clear rank; capture allowed on enemy', () => {
    // Updated: pawns do not mirror horizontally. They project a mirror capture to the opposite file on back rank.
    // Start from a minimal position with only a white pawn at a4.
    const s2 = fromPiecesSpec('w:Pa4', 'white')
    // No enemy on h8 yet → no mirror capture
    let moves = legalMovesFor(s2, c(0,3))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 3)).toBe(false)
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 7)).toBe(false)
    // Put a black rook on h5 (mirror of a5) → expect mirror capture to h5
    const s3 = { ...s2, board: s2.board.slice() }
    s3.board[4 * 8 + 7] = { kind: 'R', color: 'black' }
    moves = legalMovesFor(s3, c(0,3))
    expect(moves.some(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 4)).toBe(true)
  })
})


