import { describe, it, expect } from 'vitest'
import type { GameStatus } from '@game/status'
import { describeStatus } from './status-text'

/** Every status, so a newly added one fails here until it has wording. */
const ALL_STATUSES: readonly GameStatus[] = [
  'playing', 'check', 'checkmate', 'stalemate',
  'draw-repetition', 'draw-fifty-move', 'draw-insufficient-material', 'move-limit',
]

describe('describeStatus', () => {
  it('names the side to move while the game is running', () => {
    expect(describeStatus('playing', 'white')).toBe('Turn: white')
    expect(describeStatus('playing', 'black')).toBe('Turn: black')
  })

  it('announces check alongside the side to move', () => {
    expect(describeStatus('check', 'white')).toBe('Turn: white — check')
  })

  it('names the winner on checkmate — the side to move is the one mated', () => {
    expect(describeStatus('checkmate', 'black')).toBe('Checkmate — white wins')
    expect(describeStatus('checkmate', 'white')).toBe('Checkmate — black wins')
  })

  it('reports stalemate as a draw', () => {
    expect(describeStatus('stalemate', 'black')).toBe('Stalemate — draw')
  })

  it('names which draw it was, since the three are easy to confuse', () => {
    expect(describeStatus('draw-repetition', 'black')).toBe('Draw — threefold repetition')
    expect(describeStatus('draw-fifty-move', 'black')).toBe('Draw — fifty-move rule')
    expect(describeStatus('draw-insufficient-material', 'black')).toBe('Draw — insufficient material')
  })

  it('does not call the move limit a draw — it is not a result', () => {
    const text = describeStatus('move-limit', 'white')

    expect(text).toBe('Move limit reached — no result')
    expect(text.toLowerCase()).not.toContain('draw')
  })

  it('always returns something for the live region to announce', () => {
    for (const status of ALL_STATUSES) {
      expect(describeStatus(status, 'white').length).toBeGreaterThan(0)
    }
  })
})
