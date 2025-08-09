import { describe, it, expect } from 'vitest'
import { initialPosition } from '../src/game/setup'
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
})


