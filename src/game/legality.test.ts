import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { legalMovesFor, pseudoLegalMovesFor } from './moves'
import { applyMoveToBoard } from './board'
import { isInCheck } from './attacks'
import { allLegalMoves } from './status'
import { reduceMove } from './reducer'
import { makeMove } from './move'
import { algebraic, parseAlgebraic } from './coord'
import { ruleSetOf } from './rules'
import type { Color, GameState } from './types'

/**
 * Executable form of `prj-mgmt/epics/rules/mirror-portal-spec.md` §10.2–§10.3 —
 * check, self-check filtering and pins.
 */

const destinations = (state: GameState, square: string): string[] =>
  legalMovesFor(state, parseAlgebraic(square)).map(m => algebraic(m.to)).sort()

const sorted = (squares: readonly string[]): string[] => [...squares].sort()

describe('§10.3 a move may not leave your own king attacked', () => {
  it('a pinned rook may only move along the pin, including capturing the pinner', () => {
    const s = fromPiecesSpec('w:Ke1,Re2; b:Re8', 'white')

    expect(destinations(s, 'e2')).toEqual(sorted(['e3', 'e4', 'e5', 'e6', 'e7', 'e8']))
  })

  it('the pin is real: pseudo-legal generation offers the moves legality removes', () => {
    const s = fromPiecesSpec('w:Ke1,Re2; b:Re8', 'white')
    const pseudo = pseudoLegalMovesFor(s, parseAlgebraic('e2')).map(m => algebraic(m.to))

    expect(pseudo).toContain('d2')
    expect(destinations(s, 'e2')).not.toContain('d2')
  })

  it('a king may not step along a checking ray away from the checker', () => {
    const s = fromPiecesSpec('w:Ke1; b:Re8', 'white')

    expect(destinations(s, 'e1')).toEqual(sorted(['d1', 'f1', 'd2', 'f2']))
    expect(destinations(s, 'e1')).not.toContain('e2')
  })

  it('a king may not capture a defended piece', () => {
    // The black rook on e2 checks the king and is defended along the rank by h2.
    const s = fromPiecesSpec('w:Ke1; b:Re2,Rh2', 'white')

    expect(s.inCheck).toBe(true)
    expect(destinations(s, 'e1')).toEqual(sorted(['d1', 'f1']))
    expect(destinations(s, 'e1')).not.toContain('e2')
  })

  it('a king may capture an undefended checker', () => {
    const s = fromPiecesSpec('w:Ke1; b:Re2', 'white')

    expect(destinations(s, 'e1')).toContain('e2')
  })
})

describe('§10.3 check delivered through the seam', () => {
  // A white bishop on b3 portals via a2 → h2 → g1, so it checks a king on g1
  // without any standard diagonal reaching it.
  const spec = 'w:Bb3; b:Kg1'

  it('is detected as check', () => {
    expect(fromPiecesSpec(spec, 'black').inCheck).toBe(true)
  })

  it('restricts the king to squares off the portal ray', () => {
    const s = fromPiecesSpec(spec, 'black')

    expect(destinations(s, 'g1')).toEqual(sorted(['f1', 'h1', 'f2', 'g2']))
    // h2 lies on the portal ray, g1 is the checked square itself.
    expect(destinations(s, 'g1')).not.toContain('h2')
  })

  it('can be blocked by occupying the portal mouth on the near side', () => {
    // Rd2 → a2 fills the edge square, so the ray can no longer pass through it (§4).
    const s = fromPiecesSpec('w:Kg1,Rd2; b:Bb3', 'white')

    expect(destinations(s, 'd2')).toContain('a2')
  })

  it('can be blocked by interposing on the far side of the seam', () => {
    const s = fromPiecesSpec('w:Kg1,Rd2; b:Bb3', 'white')

    expect(destinations(s, 'd2')).toContain('h2')
  })

  it('offers only moves that actually resolve it', () => {
    const s = fromPiecesSpec('w:Kg1,Rd2; b:Bb3', 'white')

    // Every rook move that neither fills a2 nor interposes on h2 is filtered out.
    expect(destinations(s, 'd2')).toEqual(sorted(['a2', 'h2']))
  })
})

describe('§10.3 invariant: every legal move leaves the mover out of check', () => {
  it.each([
    ['w:Ke1,Re2; b:Re8', 'white'],
    ['w:Ke1; b:Re2,Rh2', 'white'],
    ['w:Kg1,Rd2; b:Bb3', 'white'],
    ['w:Bb3; b:Kg1', 'black'],
    ['w:Ke1,Qd1,Ra1,Rh1,Pa2,Pb2; b:Ke8,Qd8,Ra8,Rh8,Pa7,Pb7', 'white'],
  ])('%s (%s to move)', (spec, color) => {
    const s = fromPiecesSpec(spec, color as Color)
    const moves = allLegalMoves(s, color as Color)

    expect(moves.length).toBeGreaterThan(0)
    for (const m of moves) {
      expect(isInCheck({ board: applyMoveToBoard(s.board, m), rules: s.rules }, color as Color)).toBe(false)
    }
  })
})

describe('§10.2 GameState.inCheck tracks the side to move', () => {
  it('is false in the opening position', () => {
    expect(fromPiecesSpec('w:Ke1; b:Ke8', 'white').inCheck).toBe(false)
  })

  it('is set when constructing a checked position', () => {
    expect(fromPiecesSpec('w:Ke1; b:Re8', 'white').inCheck).toBe(true)
    // The same position with black to move: black is not the one in check.
    expect(fromPiecesSpec('w:Ke1; b:Re8', 'black').inCheck).toBe(false)
  })

  it('is recomputed after a move', () => {
    // Ra1 → e1 delivers check to the black king on e8.
    const s = fromPiecesSpec('w:Ra1,Kh1; b:Ke8', 'white')
    const next = reduceMove(s, makeMove(parseAlgebraic('a1'), parseAlgebraic('e1'), 'quiet'))

    expect(next).not.toBe(s)
    expect(next.turn).toBe('black')
    expect(next.inCheck).toBe(true)
  })
})

describe('§10.3 the reducer rejects illegal moves', () => {
  it('refuses a move that would expose the king', () => {
    const s = fromPiecesSpec('w:Ke1,Re2; b:Re8', 'white')
    const next = reduceMove(s, makeMove(parseAlgebraic('e2'), parseAlgebraic('d2'), 'quiet'))

    expect(next).toBe(s)
  })

  it('refuses to move a piece belonging to the side not on turn', () => {
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white')
    const next = reduceMove(s, makeMove(parseAlgebraic('h8'), parseAlgebraic('h5'), 'quiet'))

    expect(next).toBe(s)
  })

  it('accepts a legal move', () => {
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8', 'white')
    const next = reduceMove(s, makeMove(parseAlgebraic('a1'), parseAlgebraic('a5'), 'quiet'))

    expect(next).not.toBe(s)
    expect(next.board[parseAlgebraic('a5').r * 8 + parseAlgebraic('a5').f]?.kind).toBe('R')
  })
})

describe('§2.1 a king may not cross the seam into a square the enemy controls', () => {
  // The rule the move/attack invariant exists to protect. Under a standard ruleset a
  // king that can step across the seam also attacks across it, so the ordinary
  // "may not move into check" filter does the work — no special case anywhere.
  it('may not step beside the enemy king across the seam', () => {
    const s = fromPiecesSpec('w:Kb1; b:Kh1', 'white')

    expect(destinations(s, 'b1')).not.toContain('a1')
  })

  it('may not, from the other side of the seam either', () => {
    // Same position mirrored: the rule is symmetric, and asserting it twice is how a
    // one-sided implementation gets caught.
    const s = fromPiecesSpec('w:Kg1; b:Ka1', 'white')

    expect(destinations(s, 'g1')).not.toContain('h1')
  })

  it('may not step onto the seam square when a bishop attacks it through the seam', () => {
    // Black bishop on b3 attacks h4 via the a4 portal mouth (spec §5.1).
    const s = fromPiecesSpec('w:Kg4; b:Kd8,Bb3', 'white')

    expect(destinations(s, 'g4')).not.toContain('h4')
  })

  it('may not step onto a square a rook attacks through the seam', () => {
    // Black rook on a4 reaches h4 leftward through the portal (spec §5.3).
    const s = fromPiecesSpec('w:Kg5; b:Kd8,Ra4', 'white')

    expect(destinations(s, 'g5')).not.toContain('h4')
  })

  it('may not step onto a square a queen attacks through the seam', () => {
    const s = fromPiecesSpec('w:Kg5; b:Kd8,Qa4', 'white')

    expect(destinations(s, 'g5')).not.toContain('h4')
  })

  it('may not step onto a square a knight attacks by wrapping the file', () => {
    // Black knight on a3 attacks h5, h1, g4 and g2 (spec §11.4).
    const s = fromPiecesSpec('w:Kg6; b:Kd8,Na3', 'white')

    expect(destinations(s, 'g6')).not.toContain('h5')
  })

  it('may not step onto a square a pawn attacks across the seam', () => {
    // A black pawn on a5 captures onto h4: its capture diagonals wrap (§11.2).
    const s = fromPiecesSpec('w:Kg3; b:Kd8,Pa5', 'white')

    expect(destinations(s, 'g3')).not.toContain('h4')
  })

  it('may still cross when nothing controls the far side', () => {
    // The mirror image of every assertion above: the rule forbids crossing into check,
    // never crossing itself. A king on the a-file wraps to the h-file keeping its rank
    // (§11), so these three destinations exist only because of the seam.
    const s = fromPiecesSpec('w:Ka4; b:Kd8', 'white')

    expect(destinations(s, 'a4')).toEqual(sorted(['a3', 'a5', 'b3', 'b4', 'b5', 'h3', 'h4', 'h5']))
  })

  it('may not cross onto a far-side square an ordinary rook defends', () => {
    // The crossing is what the seam adds; the defence is plain chess down the h-file.
    // Both halves of the rule have to meet for the king to be stopped here.
    const s = fromPiecesSpec('w:Ka4; b:Kd8,Rh8', 'white')

    expect(destinations(s, 'a4')).not.toContain('h4')
    expect(destinations(s, 'a4')).toContain('b4')
  })

  it('with the king flag off, the far-side squares are not reachable at all', () => {
    const steppersOff = ruleSetOf(['B', 'R', 'Q'])
    const s = fromPiecesSpec('w:Ka4; b:Kd8', 'white', steppersOff)

    expect(destinations(s, 'a4')).toEqual(sorted(['a3', 'a5', 'b3', 'b4', 'b5']))
  })
})
