import { describe, it, expect } from 'vitest'
import { fromPiecesSpec, initialPosition } from './setup'
import { legalMovesFor } from './moves'
import { algebraic, parseAlgebraic } from './coord'
import type { GameState, Move } from './types'

/**
 * Executable form of `prj-mgmt/epics/rules/mirror-portal-spec.md` (v1).
 * Section references in the test names point back at that document — it is the
 * oracle, these are only its assertions.
 */

const movesFrom = (state: GameState, square: string): Move[] =>
  legalMovesFor(state, parseAlgebraic(square))

/** Algebraic destinations of every portal move, sorted for order-independent compare. */
const mirrorDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square)
    .filter(m => m.crossedSeam)
    .map(m => algebraic(m.to))
    .sort()

/** Algebraic destinations of every non-portal move, sorted. */
const standardDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square)
    .filter(m => !m.crossedSeam)
    .map(m => algebraic(m.to))
    .sort()

const sorted = (squares: readonly string[]): string[] => [...squares].sort()

describe('mirror portal §5 — worked examples (the acceptance oracle)', () => {
  it('§5.1 bishop b3 on an empty board portals to h4,g5,f6,e7,d8 and h2,g1', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')

    expect(mirrorDestinations(s, 'b3')).toEqual(sorted(['h4', 'g5', 'f6', 'e7', 'd8', 'h2', 'g1']))
    expect(standardDestinations(s, 'b3')).toEqual(
      sorted(['a4', 'c4', 'd5', 'e6', 'f7', 'g8', 'a2', 'c2', 'd1']),
    )
  })

  it('§5.1 headline: the portal mouths for a bishop on b3 are h4 and h2 — never h5', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')
    const mirrors = mirrorDestinations(s, 'b3')

    expect(mirrors).toContain('h4')
    expect(mirrors).toContain('h2')
    // The cylinder-wrap bug advanced the rank on the hop and produced h5/h1 instead.
    expect(mirrors).not.toContain('h5')
    expect(mirrors).not.toContain('h1')
  })

  it('§5.2 bishop c1 portals through both seams, emitting the shared square c8 once', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')

    // via a3 (left): h3,g4,f5,e6,d7,c8 — via h6 (right): a6,b7,c8
    expect(mirrorDestinations(s, 'c1')).toEqual(
      sorted(['h3', 'g4', 'f5', 'e6', 'd7', 'c8', 'a6', 'b7']),
    )
    expect(mirrorDestinations(s, 'c1').filter(sq => sq === 'c8')).toHaveLength(1)
    expect(standardDestinations(s, 'c1')).toEqual(sorted(['d2', 'e3', 'f4', 'g5', 'h6', 'b2', 'a3']))
  })

  it('§5.3 rook a4 reaches behind an enemy on c4 via the left seam', () => {
    const s = fromPiecesSpec('w:Ra4; b:Pc4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h4', 'g4', 'f4', 'e4', 'd4']))
    // c4 is an ordinary capture, so it is never re-emitted as a portal hint.
    expect(standardDestinations(s, 'a4')).toContain('c4')
    expect(mirrorDestinations(s, 'a4')).not.toContain('c4')
  })

  it('§5.3 on an empty rank the portal adds nothing new — every square dedupes', () => {
    const s = fromPiecesSpec('w:Ra4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual([])
    expect(standardDestinations(s, 'a4')).toEqual(
      sorted(['b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'a5', 'a6', 'a7', 'a8', 'a3', 'a2', 'a1']),
    )
  })

  it('§5.4 the queen portal set is the union of its rook and bishop portal rays', () => {
    const queen = fromPiecesSpec('w:Qb3', 'white')
    const bishop = fromPiecesSpec('w:Bb3', 'white')
    const rook = fromPiecesSpec('w:Rb3', 'white')

    const union = new Set([...mirrorDestinations(bishop, 'b3'), ...mirrorDestinations(rook, 'b3')])
    // A square the queen reaches normally is not re-emitted as a portal hint.
    const queenStandard = new Set(standardDestinations(queen, 'b3'))

    expect(mirrorDestinations(queen, 'b3')).toEqual(sorted([...union].filter(sq => !queenStandard.has(sq))))
    expect(mirrorDestinations(queen, 'b3')).toEqual(sorted(['h4', 'g5', 'f6', 'e7', 'd8', 'h2', 'g1']))
  })
})

describe('mirror portal §4 — the portal rule', () => {
  it('a piece already on the edge file is its own portal mouth', () => {
    // Both leftward rays of a bishop on a4 hop straight to h4, then resume their own
    // diagonal: NW gives g5,f6,e7,d8 and SW gives g3,f2,e1.
    const s = fromPiecesSpec('w:Ba4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(
      sorted(['h4', 'g5', 'f6', 'e7', 'd8', 'g3', 'f2', 'e1']),
    )
  })

  it('the far-side walk continues in the original direction, not along the rank', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')
    const mirrors = mirrorDestinations(s, 'b3')

    // The NW ray resumes from h4 as g5,f6,e7,d8 — it does not slide h4,g4,f4…
    expect(mirrors).not.toContain('g4')
    expect(mirrors).not.toContain('f4')
  })

  it('a ray that leaves through the top or bottom edge never portals', () => {
    // Bishop d4: NE reaches h8 → a8; NW reaches a7 → h7,g8; SW reaches a1 → h1.
    // The SE ray (e3,f2,g1) runs off the bottom before touching the h-file, so it
    // contributes nothing.
    const s = fromPiecesSpec('w:Bd4', 'white')

    expect(mirrorDestinations(s, 'd4')).toEqual(sorted(['a8', 'h7', 'g8', 'h1']))
  })

  it('vertical rays never portal even when the file is wide open', () => {
    // Both horizontal rays are blocked immediately; the d-file is empty top to bottom.
    const s = fromPiecesSpec('w:Rd4; b:Pc4,Pe4', 'white')

    expect(mirrorDestinations(s, 'd4')).toEqual([])
    expect(standardDestinations(s, 'd4')).toEqual(
      sorted(['c4', 'e4', 'd5', 'd6', 'd7', 'd8', 'd3', 'd2', 'd1']),
    )
  })

  it('a ray crosses at most one seam — it stops rather than wrapping twice', () => {
    // Rook a4 portals to h4 and slides left until the enemy on b4; it must not carry
    // on through the seam a second time.
    const s = fromPiecesSpec('w:Ra4; b:Pb4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h4', 'g4', 'f4', 'e4', 'd4', 'c4']))
    expect(standardDestinations(s, 'a4')).toContain('b4')
  })

  it('§7 finiteness: a queen on an empty board generates exactly 27 standard + 4 portal moves', () => {
    const s = fromPiecesSpec('w:Qd4', 'white')

    expect(standardDestinations(s, 'd4')).toHaveLength(27)
    expect(mirrorDestinations(s, 'd4')).toEqual(sorted(['a8', 'h7', 'g8', 'h1']))
    expect(movesFrom(s, 'd4')).toHaveLength(31)
  })
})

describe('mirror portal §6 — occupancy and capture', () => {
  it('an enemy on the edge square is an ordinary capture and blocks the portal', () => {
    const s = fromPiecesSpec('w:Rd4; b:Pa4', 'white')

    expect(standardDestinations(s, 'd4')).toContain('a4')
    // The rightward ray reaches h4 and re-enters at a4 — already a standard capture.
    expect(mirrorDestinations(s, 'd4')).toEqual([])
  })

  it('an own piece on the path to the seam blocks the portal', () => {
    const s = fromPiecesSpec('w:Rd4,Pb4,Pf4', 'white')

    expect(mirrorDestinations(s, 'd4')).toEqual([])
  })

  it('the far-side walk stops at the first piece and captures it when it is an enemy', () => {
    const s = fromPiecesSpec('w:Ra4; b:Pe4,Pc4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h4', 'g4', 'f4', 'e4']))
  })

  it('a portal move never lands on an own piece', () => {
    const s = fromPiecesSpec('w:Ra4,Pe4; b:Pc4', 'white')
    const mirrors = mirrorDestinations(s, 'a4')

    expect(mirrors).toEqual(sorted(['h4', 'g4', 'f4']))
    expect(mirrors).not.toContain('e4')
  })

  it('the origin square terminates the far-side walk', () => {
    const s = fromPiecesSpec('w:Ra4; b:Pc4', 'white')

    expect(mirrorDestinations(s, 'a4')).not.toContain('a4')
  })
})

describe('mirror portal §11 — steppers cross by wrapping the file', () => {
  it('§11.4 the knight on a3 keeps its L and wraps the file', () => {
    const s = fromPiecesSpec('w:Na3', 'white')

    expect(standardDestinations(s, 'a3')).toEqual(sorted(['b1', 'c2', 'c4', 'b5']))
    expect(mirrorDestinations(s, 'a3')).toEqual(sorted(['h5', 'g4', 'g2', 'h1']))
  })

  it('§11.4 the king on a3 reaches h2, h3 and h4', () => {
    const s = fromPiecesSpec('w:Ka3', 'white')

    expect(standardDestinations(s, 'a3')).toEqual(sorted(['a4', 'a2', 'b4', 'b3', 'b2']))
    expect(mirrorDestinations(s, 'a3')).toEqual(sorted(['h4', 'h3', 'h2']))
  })

  it('§11.2 a pawn push never wraps, so a lone edge pawn has no portal move', () => {
    const s = fromPiecesSpec('w:Pa3', 'white')

    expect(standardDestinations(s, 'a3')).toEqual(['a4'])
    expect(mirrorDestinations(s, 'a3')).toEqual([])
  })

  it('§11.4 a pawn capture diagonal does wrap, given something to capture', () => {
    const s = fromPiecesSpec('w:Pa4; b:Rh5', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(['h5'])
  })

  it('§11.5 a king on a4 steps north-west to h5, where a bishop would reach h4', () => {
    // The two crossings differ by design — see spec §11.1 and §11.5.
    expect(mirrorDestinations(fromPiecesSpec('w:Ka4', 'white'), 'a4')).toContain('h5')
    expect(mirrorDestinations(fromPiecesSpec('w:Ba4', 'white'), 'a4')).toContain('h4')
    expect(mirrorDestinations(fromPiecesSpec('w:Ba4', 'white'), 'a4')).not.toContain('h5')
  })

  it('no piece in the opening position has a mirror move', () => {
    const s = initialPosition()

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        expect(legalMovesFor(s, { f, r }).filter(m => m.crossedSeam)).toEqual([])
      }
    }
  })
})

describe('mirror portal §7 — invariants', () => {
  /** Reflect every square in a piece spec across the center file: `Bb3` → `Bg3`. */
  const mirrorSpec = (spec: string): string =>
    spec.replace(/([KQRBNP])([a-h])([1-8])/g, (_all, kind: string, file: string, rank: string) => {
      const mirrored = String.fromCharCode(97 + (7 - (file.charCodeAt(0) - 97)))
      return `${kind}${mirrored}${rank}`
    })

  const mirrorSquare = (square: string): string => mirrorSpec(`R${square}`).slice(1)

  it.each([
    ['w:Bb3', 'b3'],
    ['w:Bc1', 'c1'],
    ['w:Ra4; b:Pc4', 'a4'],
    ['w:Qd4; b:Pb4,Pf6', 'd4'],
    ['w:Rd4,Pb4; b:Pf4', 'd4'],
  ])('symmetry: %s produces the reflection of the reflected position\'s moves', (spec, square) => {
    const key = (ms: readonly Move[]): string[] =>
      ms.map(m => `${algebraic(m.to)}${(m.crossedSeam ? 'mirror' : '')}`).sort()
    const reflectedKey = (ms: readonly Move[]): string[] =>
      ms.map(m => `${mirrorSquare(algebraic(m.to))}${(m.crossedSeam ? 'mirror' : '')}`).sort()

    const direct = movesFrom(fromPiecesSpec(spec, 'white'), square)
    const reflected = movesFrom(fromPiecesSpec(mirrorSpec(spec), 'white'), mirrorSquare(square))

    expect(reflectedKey(reflected)).toEqual(key(direct))
  })

  it('superset: the portal never removes a standard destination (bishop)', () => {
    const s = fromPiecesSpec('w:Bc1; b:Pe3', 'white')

    expect(standardDestinations(s, 'c1')).toEqual(sorted(['d2', 'e3', 'b2', 'a3']))
  })

  it('superset: the portal never removes a standard destination (rook)', () => {
    const s = fromPiecesSpec('w:Rd4; b:Pb4,Pf4', 'white')

    expect(standardDestinations(s, 'd4')).toEqual(
      sorted(['e4', 'f4', 'c4', 'b4', 'd5', 'd6', 'd7', 'd8', 'd3', 'd2', 'd1']),
    )
  })

  it('no rank change on the hop: a bishop leaving a4 emerges on h4, never h5 or h3', () => {
    const mirrors = mirrorDestinations(fromPiecesSpec('w:Ba4', 'white'), 'a4')

    expect(mirrors).toContain('h4')
    expect(mirrors).not.toContain('h5')
    expect(mirrors).not.toContain('h3')
  })
})
