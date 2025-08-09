import { describe, it, expect } from 'vitest'
import { initialPosition, fromPiecesSpec } from '../src/game/setup'
import { legalMovesFor } from '../src/game/moves'
import type { Coord } from '../src/game/types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('mirror portal (horizontal)', () => {
  it('queen can portal horizontally to h3 but not diagonally to h7 (non-portal)', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    // Clear rank r=2 (3rd rank) and place white queen at d3 (f=3,r=2)
    for (let f = 0; f < 8; f++) s2.board[2 * 8 + f] = null
    s2.board[2 * 8 + 3] = { kind: 'Q', color: 'white' }
    // Put a white pawn on e4 to block the diagonal towards h7 so h7 is not a legal normal move
    s2.board[3 * 8 + 4] = { kind: 'P', color: 'white' }
    // Put a black pawn at h7 (f=7,r=6)
    s2.board[6 * 8 + 7] = { kind: 'P', color: 'black' }

    const moves = legalMovesFor(s2, c(3,2))
    const toH3 = moves.find(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 2)
    const toH7 = moves.find(m => m.to.f === 7 && m.to.r === 6)
    expect(toH3).toBeTruthy()
    expect(toH7).toBeFalsy()
  })

  it('spec loader: black queen c6 with pawns d6,g6 allows mirror extension to h6? (should be blocked)', () => {
    // Arrange the exact position via pieces spec
    const s = fromPiecesSpec('b:Qc6,Pd6,Pg6', 'black')
    const moves = legalMovesFor(s, c(2,5)) // c6 is (f=2,r=5)
    // Cannot move to d6 (own pawn); cannot mirror-through to h6 because d6 blocks the path
    const toD6 = moves.find(m => m.to.f === 3 && m.to.r === 5)
    const toH6 = moves.find(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 5)
    expect(toD6).toBeFalsy()
    expect(toH6).toBeFalsy()
  })

  it('knight at h3 portals to a5 (not a3)', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice() }
    // Clear rank 3 (r=2) and nearby to avoid blockers; place knight at h3 (f=7,r=2)
    for (let f = 0; f < 8; f++) s2.board[2 * 8 + f] = null
    s2.board[2 * 8 + 7] = { kind: 'N', color: 'white' }
    // Ensure a5 (f=0,r=4) empty; a3 (f=0,r=2) empty
    s2.board[4 * 8 + 0] = null
    s2.board[2 * 8 + 0] = null
    const moves = legalMovesFor(s2, c(7,2))
    const toA5 = moves.find(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 4)
    const toA3 = moves.find(m => m.special === 'mirror' && m.to.f === 0 && m.to.r === 2)
    expect(toA5).toBeTruthy()
    expect(toA3).toBeFalsy()
  })

  it('black queen at d6 cannot portal past own pawn at g6 to h6', () => {
    const s = initialPosition()
    const s2 = { ...s, board: s.board.slice(), turn: 'black' as const }
    // Clear rank 6 (r=5) then place black queen at d6 (f=3,r=5) and own pawn at g6 (f=6,r=5)
    for (let f = 0; f < 8; f++) s2.board[5 * 8 + f] = null
    s2.board[5 * 8 + 3] = { kind: 'Q', color: 'black' }
    s2.board[5 * 8 + 6] = { kind: 'P', color: 'black' }

    const moves = legalMovesFor(s2, c(3,5))
    const toH6 = moves.find(m => m.special === 'mirror' && m.to.f === 7 && m.to.r === 5)
    const toG6 = moves.find(m => m.to.f === 6 && m.to.r === 5)
    // Should not be able to jump over own pawn via portal extension; may not capture own pawn either
    expect(toG6).toBeFalsy()
    expect(toH6).toBeFalsy()
  })
})


