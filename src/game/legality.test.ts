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
  // A white bishop on b3 runs a4 | h5, g6, f7, e8 (spec §5.1 as revised), so it checks a
  // king on g6 with no standard diagonal reaching it.
  const spec = 'w:Bb3; b:Kg6'

  it('is detected as check', () => {
    expect(fromPiecesSpec(spec, 'black').inCheck).toBe(true)
  })

  it('restricts the king to squares off the crossed ray', () => {
    const s = fromPiecesSpec(spec, 'black')

    // f7 and h5 are the ray's neighbours of g6 and stay attacked; everything else is a
    // dark square, which a bishop on light b3 can never reach (spec §7).
    expect(destinations(s, 'g6')).toEqual(sorted(['f5', 'f6', 'g5', 'g7', 'h6', 'h7']))
    expect(destinations(s, 'g6')).not.toContain('h5')
    expect(destinations(s, 'g6')).not.toContain('f7')
  })

  it('can be blocked on the near side of the seam', () => {
    // Ra5 → a4 occupies the ray's last square before the crossing.
    const s = fromPiecesSpec('w:Kg6,Ra5; b:Bb3', 'white')

    expect(destinations(s, 'a5')).toContain('a4')
  })

  it('can be blocked by interposing past the seam', () => {
    const s = fromPiecesSpec('w:Kg6,Ra5; b:Bb3', 'white')

    expect(destinations(s, 'a5')).toContain('h5')
  })

  it('offers only moves that actually resolve it', () => {
    const s = fromPiecesSpec('w:Kg6,Ra5; b:Bb3', 'white')

    // Every rook move that neither fills a4 nor interposes on h5 is filtered out.
    expect(destinations(s, 'a5')).toEqual(sorted(['a4', 'h5']))
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

  it('may not cross the seam onto a square a bishop attacks through the seam', () => {
    // Black bishop on b3 runs a4 | h5 (spec §5.1), so h5 is attacked from the far side.
    // The white king on a5 crosses the seam westward — onto h5, which it may not do.
    const s = fromPiecesSpec('w:Ka5; b:Kd8,Bb3', 'white')

    expect(destinations(s, 'a5')).not.toContain('h5')
    // ...while h6 and h4 are dark, unreachable by a light bishop, and therefore still
    // offered. Asserted so a fixture that rendered no crossings at all could not pass.
    expect(destinations(s, 'a5')).toContain('h6')
    expect(destinations(s, 'a5')).toContain('h4')
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
