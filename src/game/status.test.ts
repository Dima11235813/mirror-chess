import { describe, it, expect } from 'vitest'
import { fromPiecesSpec, initialPosition } from './setup'
import { allLegalMoves, gameStatus, isDraw, isGameOver } from './status'
import { reduceMove } from './reducer'
import { makeMove } from './move'
import { attacksFrom } from './attacks'
import { algebraic, parseAlgebraic } from './coord'
import { RULES_STANDARD_CHESS } from './rules'

/**
 * Executable form of `prj-mgmt/epics/rules/mirror-portal-spec.md` §10.4 — terminal
 * states — extended by `prj-mgmt/epics/rules/draw-rules.md` with the three draws and the
 * move-limit backstop.
 */

describe('§10.4 ordinary positions', () => {
  it('the opening position is playing', () => {
    expect(gameStatus(initialPosition())).toBe('playing')
    expect(allLegalMoves(initialPosition(), 'white')).toHaveLength(20)
  })

  it('a position with an escapable check is reported as check, not mate', () => {
    expect(gameStatus(fromPiecesSpec('w:Ke1; b:Re8', 'white'))).toBe('check')
  })

  it('neither check nor playing is a game over', () => {
    expect(isGameOver('playing')).toBe(false)
    expect(isGameOver('check')).toBe(false)
    expect(isGameOver('checkmate')).toBe(true)
    expect(isGameOver('stalemate')).toBe(true)
  })

  it('every draw is a game over, and the move limit is a game over that is not a draw', () => {
    for (const status of ['draw-repetition', 'draw-fifty-move', 'draw-insufficient-material'] as const) {
      expect(isGameOver(status)).toBe(true)
      expect(isDraw(status)).toBe(true)
    }
    expect(isGameOver('move-limit')).toBe(true)
    expect(isDraw('move-limit')).toBe(false)
    expect(isDraw('stalemate')).toBe(true)
    expect(isDraw('checkmate')).toBe(false)
  })
})

describe('§10.4 checkmate', () => {
  it('detects a back-rank mate', () => {
    // Black king boxed in by its own pawns; the rook checks along the 8th rank and
    // also covers h8 through the seam. The king stands on g8, not the h-file, so it
    // has no wrap of its own to escape with (§11.2).
    const s = fromPiecesSpec('w:Ka1,Re8; b:Kg8,Pf7,Pg7,Ph7', 'black')

    expect(gameStatus(s)).toBe('checkmate')
    expect(allLegalMoves(s, 'black')).toHaveLength(0)
  })

  it('detects a mate delivered only through the mirror seam', () => {
    // Ra1's rank-1 ray is blocked by the knight on d1, so it does not reach h1 in
    // standard chess. It reaches h1 through the seam: a1 is its own portal mouth and
    // the ray re-enters on h1 (§4). Rb2 covers g2 and h2; g1 is unavailable because
    // vacating h1 lets the portal ray run on to it; and the king's own wrap onto a1
    // is refused because Nb3 defends the rook there.
    const s = fromPiecesSpec('w:Ka8,Ra1,Nd1,Rb2,Nb3; b:Kh1', 'black')

    expect(gameStatus(s)).toBe('checkmate')
  })

  it('that mate really does depend on the portal', () => {
    const s = fromPiecesSpec('w:Ka8,Ra1,Nd1,Rb2,Nb3; b:Kh1', 'black')
    const rookAttacks = attacksFrom(s, parseAlgebraic('a1')).map(algebraic)

    // The rook attacks h1 across the seam, and is blocked short of it on the rank.
    expect(rookAttacks).toContain('h1')
    expect(rookAttacks).toContain('d1') // stops on the friendly knight
    expect(rookAttacks).not.toContain('e1') // ...and no further along the rank
  })

  it('a king on the h-file can escape a would-be mate through the seam', () => {
    // The same position as the back-rank mate but with the king on h8, which under
    // §11.2 can wrap onto a8 and capture the rook. Kings are much harder to corner.
    const s = fromPiecesSpec('w:Ka1,Ra8; b:Kh8,Pg7,Ph7', 'black')

    expect(gameStatus(s)).toBe('check')
    expect(allLegalMoves(s, 'black').map(m => algebraic(m.to))).toContain('a8')
  })
})

describe('draws reported by gameStatus', () => {
  it('reports insufficient material, and reports it per ruleset', () => {
    expect(gameStatus(fromPiecesSpec('w:Ke1; b:Ke8', 'white'))).toBe('draw-insufficient-material')

    // A lone bishop is a dead draw in chess and a live game once it can portal — the
    // same board, two answers, which is why status needs the ruleset.
    const loneBishop = 'w:Ke1,Bc1; b:Ke8'
    expect(gameStatus(fromPiecesSpec(loneBishop, 'white', RULES_STANDARD_CHESS)))
      .toBe('draw-insufficient-material')
    expect(gameStatus(fromPiecesSpec(loneBishop, 'white'))).toBe('playing')
  })

  it('reports the fifty-move rule once the clock is full', () => {
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white')
    expect(gameStatus(s)).toBe('playing')
    expect(gameStatus({ ...s, halfmoveClock: 100 })).toBe('draw-fifty-move')
  })

  it('reports repetition after the third occurrence', () => {
    let s = fromPiecesSpec('w:Ke1,Nb1; b:Ke8,Nb8', 'white')
    const cycle = [
      makeMove(parseAlgebraic('b1'), parseAlgebraic('c3'), 'quiet'),
      makeMove(parseAlgebraic('b8'), parseAlgebraic('c6'), 'quiet'),
      makeMove(parseAlgebraic('c3'), parseAlgebraic('b1'), 'quiet'),
      makeMove(parseAlgebraic('c6'), parseAlgebraic('b8'), 'quiet'),
    ]
    for (let i = 0; i < 2; i++) for (const m of cycle) s = reduceMove(s, m)

    expect(gameStatus(s)).toBe('draw-repetition')
  })

  it('checkmate beats the fifty-move clock — a mate on the fiftieth move is a mate', () => {
    const mated = fromPiecesSpec('w:Ka1,Re8; b:Kg8,Pf7,Pg7,Ph7', 'black')

    expect(gameStatus({ ...mated, halfmoveClock: 100 })).toBe('checkmate')
  })
})

describe('the move limit — a backstop, not a rule', () => {
  it('is never reported unless a limit is given', () => {
    const s = { ...fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white'), plies: 5_000 }

    expect(gameStatus(s)).toBe('playing')
    expect(gameStatus(s, { maxPlies: 4_000 })).toBe('move-limit')
    expect(gameStatus(s, { maxPlies: 6_000 })).toBe('playing')
  })

  it('never masks a real result, so a study cannot miscount one', () => {
    const drawn = { ...fromPiecesSpec('w:Ke1; b:Ke8', 'white'), plies: 5_000 }
    expect(gameStatus(drawn, { maxPlies: 1 })).toBe('draw-insufficient-material')

    const mated = { ...fromPiecesSpec('w:Ka1,Re8; b:Kg8,Pf7,Pg7,Ph7', 'black'), plies: 5_000 }
    expect(gameStatus(mated, { maxPlies: 1 })).toBe('checkmate')
  })
})

describe('§10.4 stalemate', () => {
  it('detects a stalemate', () => {
    // Black king on g8 has no legal square and is not in check: Qf6 covers f7, f8,
    // g7 and h8, Rh1 covers h7, and g8 itself is attacked by neither.
    const s = fromPiecesSpec('w:Ka1,Qf6,Rh1; b:Kg8', 'black')

    expect(s.inCheck).toBe(false)
    expect(allLegalMoves(s, 'black')).toHaveLength(0)
    expect(gameStatus(s)).toBe('stalemate')
  })
})
