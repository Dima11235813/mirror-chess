import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { attacksFrom, checkingPieces, checkPath, findKing, isInCheck, isSquareAttacked } from './attacks'
import { algebraic, parseAlgebraic, toIndex } from './coord'
import { pseudoLegalMovesFor } from './moves'
import { rulesOf, standardRuleSetTokens } from './rules'
import type { Color, Kind, Position } from './types'

/**
 * Executable form of `prj-mgmt/epics/rules/mirror-portal-spec.md` §10.1 — attacked
 * squares.
 */

/** A position (board + rules) from a compact spec. A `GameState` is a `Position`. */
const boardOf = (spec: string): Position => fromPiecesSpec(spec, 'white')

/** Attacked squares as sorted, deduped algebraic names. */
const attacks = (board: Position, square: string): string[] =>
  [...new Set(attacksFrom(board, parseAlgebraic(square)).map(algebraic))].sort()

const attacked = (board: Position, square: string, by: Color): boolean =>
  isSquareAttacked(board, parseAlgebraic(square), by)

const sorted = (squares: readonly string[]): string[] => [...squares].sort()

describe('§10.1 pawns attack their forward diagonals unconditionally', () => {
  it('a white pawn attacks both diagonals even when they are empty', () => {
    const b = boardOf('w:Pe4')

    expect(attacks(b, 'e4')).toEqual(sorted(['d5', 'f5']))
    expect(attacked(b, 'd5', 'white')).toBe(true)
  })

  it('a pawn push is not an attack', () => {
    const b = boardOf('w:Pe4')

    expect(attacks(b, 'e4')).not.toContain('e5')
    expect(attacked(b, 'e5', 'white')).toBe(false)
  })

  it('a black pawn attacks downward', () => {
    const b = boardOf('b:Pe5')

    expect(attacks(b, 'e5')).toEqual(sorted(['d4', 'f4']))
  })

  it('§11.6 an edge pawn attacks two squares, one of them across the seam', () => {
    expect(attacks(boardOf('w:Pa4'), 'a4')).toEqual(sorted(['b5', 'h5']))
    expect(attacks(boardOf('w:Ph4'), 'h4')).toEqual(sorted(['g5', 'a5']))
  })

  it('§11.2 the wrap applies to the capture diagonal, never to the push', () => {
    const b = boardOf('w:Pa4')

    // a5 is the push; h4 would be a sideways move, which pawns never have.
    expect(attacks(b, 'a4')).not.toContain('a5')
    expect(attacks(b, 'a4')).not.toContain('h4')
  })

  it('a pawn gives check across the seam', () => {
    expect(isInCheck(boardOf('w:Pa4; b:Kh5'), 'black')).toBe(true)
  })
})

describe('§10.1 knights and kings attack their whole step set', () => {
  it('a knight attacks its L-squares regardless of occupancy', () => {
    const b = boardOf('w:Na1,Pb3')

    // b3 holds a friendly pawn and is still attacked (it is defended); g2 and h3 are
    // reached across the seam (§11.4).
    expect(attacks(b, 'a1')).toEqual(sorted(['b3', 'c2', 'g2', 'h3']))
  })

  it('a king attacks all adjacent squares', () => {
    expect(attacks(boardOf('w:Ke1'), 'e1')).toEqual(sorted(['d1', 'f1', 'd2', 'e2', 'f2']))
  })

  it('§11.6 both attack across the seam', () => {
    expect(attacks(boardOf('w:Na3'), 'a3')).toEqual(
      sorted(['b5', 'c4', 'c2', 'b1', 'h5', 'g4', 'g2', 'h1']),
    )
    expect(attacks(boardOf('w:Ka1'), 'a1')).toEqual(sorted(['a2', 'b1', 'b2', 'h1', 'h2']))
  })

  it('a knight gives check across the seam, and not on the rejected h3 square', () => {
    expect(isInCheck(boardOf('w:Na3; b:Kh5'), 'black')).toBe(true)
    expect(isInCheck(boardOf('w:Na3; b:Kh3'), 'black')).toBe(false)
  })
})

describe('§10.1 sliders attack along their rays, blocker included', () => {
  it('a ray stops at the first piece and that square is attacked', () => {
    const b = boardOf('w:Ra1,Pa3')

    expect(attacks(b, 'a1')).toContain('a2')
    expect(attacks(b, 'a1')).toContain('a3') // the friendly pawn is defended
    expect(attacks(b, 'a1')).not.toContain('a4') // but nothing beyond it
  })
})

describe('§10.1 portal rays attack', () => {
  it('a bishop on b3 attacks the far side of both seams', () => {
    const b = boardOf('w:Bb3')
    const attacked = attacks(b, 'b3')

    for (const sq of ['h4', 'g5', 'f6', 'e7', 'd8', 'h2', 'g1']) expect(attacked).toContain(sq)
    // The cylinder-wrap answer must not appear here either.
    expect(attacked).not.toContain('h5')
  })

  it('a king on a portal square is in check', () => {
    const b = boardOf('w:Bb3; b:Kh4')

    expect(isInCheck(b, 'black')).toBe(true)
  })

  it('a king behind the seam on a further portal square is in check', () => {
    const b = boardOf('w:Bb3; b:Kg1')

    expect(isInCheck(b, 'black')).toBe(true)
  })

  it('an enemy on the edge square is an ordinary attack that stops the ray', () => {
    // The king sits on the portal mouth itself: attacked normally, no portal past it.
    const b = boardOf('w:Bb3; b:Ka4')

    expect(isInCheck(b, 'black')).toBe(true)
    expect(attacks(b, 'b3')).toContain('a4')
    expect(attacks(b, 'b3')).not.toContain('h4')
  })

  it('a blocker before the seam removes the portal attack', () => {
    const b = boardOf('w:Bb3,Pa4; b:Kh4')

    expect(attacks(b, 'b3')).not.toContain('h4')
    expect(isInCheck(b, 'black')).toBe(false)
  })
})

describe('§10.2 check detection', () => {
  it('finds each king, and reports none when absent', () => {
    const b = boardOf('w:Ke1; b:Kd8')

    expect(findKing(b.board, 'white')).toEqual(parseAlgebraic('e1'))
    expect(findKing(b.board, 'black')).toEqual(parseAlgebraic('d8'))
    expect(findKing(boardOf('w:Bb3').board, 'white')).toBeNull()
  })

  it('a position with no king of that color is never in check', () => {
    const b = boardOf('w:Bb3; b:Rh4')

    expect(isInCheck(b, 'black')).toBe(false)
    expect(isInCheck(b, 'white')).toBe(false)
  })

  it('a rook on the same file gives check', () => {
    expect(isInCheck(boardOf('w:Ke1; b:Re8'), 'white')).toBe(true)
  })

  it('a blocked rook does not give check', () => {
    expect(isInCheck(boardOf('w:Ke1,Pe4; b:Re8'), 'white')).toBe(false)
  })
})

describe('checkingPieces — who is giving check', () => {
  it('is empty when not in check', () => {
    expect(checkingPieces(boardOf('w:Ke1; b:Ke8'), 'white')).toEqual([])
  })

  it('names the checking piece', () => {
    const found = checkingPieces(boardOf('w:Ke1; b:Re8'), 'white').map(algebraic)

    expect(found).toEqual(['e8'])
  })

  it('names both pieces in a double check', () => {
    // The rook checks down the e-file and the bishop along a1–h8 diagonal... to e5.
    const found = checkingPieces(boardOf('w:Ke5; b:Re8,Bh8'), 'white').map(algebraic)

    expect(sorted(found)).toEqual(sorted(['e8', 'h8']))
  })

  it('names a checker that attacks through the seam', () => {
    expect(checkingPieces(boardOf('w:Bb3; b:Kg1'), 'black').map(algebraic)).toEqual(['b3'])
  })

  it('is empty for a side with no king', () => {
    expect(checkingPieces(boardOf('w:Bb3; b:Rg1'), 'black')).toEqual([])
  })
})

describe('checkPath — where the check comes from', () => {
  const pathOf = (spec: string, attacker: string, king: string): string[] =>
    checkPath(boardOf(spec), parseAlgebraic(attacker), parseAlgebraic(king)).map(algebraic)

  it('walks a straight ray from attacker to king', () => {
    expect(pathOf('w:Ke1; b:Re8', 'e8', 'e1')).toEqual(['e7', 'e6', 'e5', 'e4', 'e3', 'e2', 'e1'])
  })

  it('is just the king for a knight, which has no intervening squares', () => {
    expect(pathOf('w:Ke1; b:Nf3', 'f3', 'e1')).toEqual(['e1'])
  })

  it('is just the king for a pawn', () => {
    expect(pathOf('w:Ke1; b:Pd2', 'd2', 'e1')).toEqual(['e1'])
  })

  it('shows the whole journey across the seam, approach and far side', () => {
    // Bb3 leaves via a2, re-enters on h2 and continues to g1.
    expect(pathOf('w:Bb3; b:Kg1', 'b3', 'g1')).toEqual(['a2', 'h2', 'g1'])
  })

  it('includes the far side only when the attacker stands on its own portal mouth', () => {
    // Ra1's rank ray is blocked by the knight, so the check arrives through the seam.
    expect(pathOf('w:Ra1,Nd1; b:Kh1', 'a1', 'h1')).toEqual(['h1'])
  })

  it('is empty when the piece does not attack the king', () => {
    expect(pathOf('w:Ke1; b:Ra8', 'a8', 'e1')).toEqual([])
  })

  it('prefers the standard ray when a piece attacks the king directly', () => {
    // Re4 attacks e1 straight down; no portal squares should appear.
    expect(pathOf('w:Ke1; b:Re4', 'e4', 'e1')).toEqual(['e3', 'e2', 'e1'])
  })
})

describe('§2.1 the move/attack invariant', () => {
  // The spec's governing principle in executable form: under a standard ruleset every
  // non-pawn piece attacks exactly the squares it can move to. Stated as a property over
  // generated positions rather than examples, because that is what it is — the examples
  // would only cover the cases we thought of, and the case nobody thought of (a king
  // crossing the seam without attacking across it) is what made this rule necessary.
  //
  // "Exactly" needs one qualification that is chess's, not the seam's: a piece also
  // attacks — defends — a square held by its own piece, where it cannot move. So the
  // invariant is: moves ⊆ attacks, and attacks \ moves are all own-occupied squares.
  const NON_PAWN: readonly Kind[] = ['K', 'Q', 'R', 'B', 'N']

  /** Deterministic LCG: a property test that cannot be replayed is not a test. */
  const rng = (seed: number) => {
    let s = seed >>> 0
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
  }

  /** A random legal-ish arrangement: one king a side, plus a few pieces, no pawns on the back ranks. */
  const randomSpec = (next: () => number): string => {
    const squares = [...Array(64).keys()].sort(() => next() - 0.5)
    const take = () => algebraic({ f: squares.pop()! % 8, r: Math.floor(squares.pop()! / 8) })
    const pieces = ['Q', 'R', 'B', 'N', 'P'] as const
    const some = (count: number) =>
      Array.from({ length: count }, () => pieces[Math.floor(next() * pieces.length)]! + take())
    return `w:K${take()},${some(3).join(',')}; b:K${take()},${some(3).join(',')}`
  }

  it('every non-pawn piece attacks every square it can move to, under every standard ruleset', () => {
    const next = rng(20260923)
    let checked = 0

    for (const token of standardRuleSetTokens()) {
      for (let sample = 0; sample < 3; sample++) {
        const state = fromPiecesSpec(randomSpec(next), 'white', rulesOf(token))

        for (let i = 0; i < 64; i++) {
          const piece = state.board[i]
          if (!piece || !NON_PAWN.includes(piece.kind)) continue
          const from = { f: i % 8, r: Math.floor(i / 8) }

          const attackSet = new Set(attacksFrom(state, from).map(algebraic))
          // Castling is a king move that is not an attack — it cannot capture, and the
          // king does not threaten the square it lands on by virtue of castling there.
          const moveSet = new Set(
            pseudoLegalMovesFor(state, from)
              .filter(m => m.flag !== 'castleKing' && m.flag !== 'castleQueen')
              .map(m => algebraic(m.to)),
          )

          for (const square of moveSet) {
            expect(attackSet, `${piece.kind} on ${algebraic(from)} under ${token} moves to ${square}`)
              .toContain(square)
          }
          for (const square of attackSet) {
            if (moveSet.has(square)) continue
            const occupant = state.board[toIndex(parseAlgebraic(square))]
            expect(occupant?.color, `${piece.kind} on ${algebraic(from)} under ${token} attacks ${square}`)
              .toBe(piece.color)
          }
          checked++
        }
      }
    }

    // A property test that silently checked nothing would pass just as happily.
    expect(checked).toBeGreaterThan(500)
  })
})
