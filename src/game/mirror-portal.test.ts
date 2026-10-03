import { describe, it, expect } from 'vitest'
import { emptyBoard, fromPiecesSpec, initialPosition } from './setup'
import { legalMovesFor } from './moves'
import { algebraic, parseAlgebraic } from './coord'
import { RULES_ALL_ON, RULES_STANDARD_CHESS } from './rules'
import { QUEEN_DIRECTIONS, walkRay } from './rays'
import type { GameState, Move } from './types'

/**
 * Executable form of `prj-mgmt/epics/rules/mirror-portal-spec.md`.
 * Section references in the test names point back at that document — it is the
 * oracle, these are only its assertions.
 *
 * **Revised 2026-10-03** for the crossing that *continues the ray* (spec §4): the file
 * wraps and the rank advances, so a bishop leaving `a4` emerges on `h5`, not `h4`.
 * Every expectation below changed with it, and the diff of this file is the clearest
 * statement of what the revision did. The old expectations are not preserved here —
 * they are preserved in `prj-mgmt/epics/rules/diagonal-crossing.md` §2 and in the spec's
 * struck-through passages, which is where a reader should look for them.
 */

const movesFrom = (state: GameState, square: string): Move[] =>
  legalMovesFor(state, parseAlgebraic(square))

/** Algebraic destinations of every seam-crossing move, sorted for order-independent compare. */
const mirrorDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square)
    .filter(m => m.crossedSeam)
    .map(m => algebraic(m.to))
    .sort()

/** Algebraic destinations of every non-crossing move, sorted. */
const standardDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square)
    .filter(m => !m.crossedSeam)
    .map(m => algebraic(m.to))
    .sort()

const sorted = (squares: readonly string[]): string[] => [...squares].sort()

/** Square colour as the spec defines it: `(f + r) mod 2`. */
const squareColour = (square: string): number => {
  const { f, r } = parseAlgebraic(square)
  return (f + r) % 2
}

describe('mirror portal §5 — worked examples (the acceptance oracle)', () => {
  it('§5.1 bishop b3 crosses to h5 and continues g6, f7, e8 — and to h1', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')

    // f7 is reached both ways (NW after the crossing, NE normally), so dedupe keeps it
    // as a standard move and it is absent from the mirror set.
    expect(mirrorDestinations(s, 'b3')).toEqual(sorted(['h5', 'g6', 'e8', 'h1']))
    expect(standardDestinations(s, 'b3')).toEqual(
      sorted(['a4', 'c4', 'd5', 'e6', 'f7', 'g8', 'a2', 'c2', 'd1']),
    )
    expect(movesFrom(s, 'b3')).toHaveLength(13)
  })

  it('§5.1 headline: the seam mouths for a bishop on b3 are h5 and h1 — never h4 or h2', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')
    const mirrors = mirrorDestinations(s, 'b3')

    expect(mirrors).toContain('h5')
    expect(mirrors).toContain('h1')
    // The rank-preserving hop this revision removed produced h4/h2 instead, and flipped
    // the bishop's square colour doing it (diagonal-crossing.md §2).
    expect(mirrors).not.toContain('h4')
    expect(mirrors).not.toContain('h2')
  })

  it('§5.1 every square a bishop on b3 reaches is light, like b3 itself', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')
    const destinations = [...mirrorDestinations(s, 'b3'), ...standardDestinations(s, 'b3')]

    expect(destinations.length).toBeGreaterThan(0)
    for (const square of destinations) {
      expect(squareColour(square), `${square} should match b3`).toBe(squareColour('b3'))
    }
  })

  it('§5.2 bishop c1 crosses both ways, and both rays are exactly 7 squares long', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')

    // NW: b2, a3 | h4, g5, f6, e7, d8   —   NE: d2, e3, f4, g5, h6 | a7, b8
    // g5 is on both rays, so the crossing copy dedupes against the standard one.
    expect(mirrorDestinations(s, 'c1')).toEqual(sorted(['h4', 'f6', 'e7', 'd8', 'a7', 'b8']))
    expect(standardDestinations(s, 'c1')).toEqual(sorted(['b2', 'a3', 'd2', 'e3', 'f4', 'g5', 'h6']))
  })

  it('§5.3 rook a4 reaches behind an enemy on c4 via the seam', () => {
    const s = fromPiecesSpec('w:Ra4; b:Pc4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h4', 'g4', 'f4', 'e4', 'd4']))
    // c4 is an ordinary capture, so it is never re-emitted as a crossing hint.
    expect(standardDestinations(s, 'a4')).toContain('c4')
    expect(mirrorDestinations(s, 'a4')).not.toContain('c4')
  })

  it('§5.3 a rook is unchanged by the 2026-10-03 revision: dr = 0, so no rank advances', () => {
    const spec = 'w:Ra4; b:Pc4'
    const all = movesFrom(fromPiecesSpec(spec, 'white', RULES_ALL_ON), 'a4')

    // The pre-revision expectation, asserted verbatim — a rank crossing *is* the old
    // same-rank hop, which is why the perft delta of the revision comes from diagonals.
    expect(all.filter(m => m.crossedSeam).map(m => algebraic(m.to)).sort())
      .toEqual(sorted(['h4', 'g4', 'f4', 'e4', 'd4']))
  })

  it('§5.3 on an empty rank the seam adds nothing new — every square dedupes', () => {
    const s = fromPiecesSpec('w:Ra4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual([])
    expect(standardDestinations(s, 'a4')).toEqual(
      sorted(['b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', 'a5', 'a6', 'a7', 'a8', 'a3', 'a2', 'a1']),
    )
  })

  it('§5.4 queen b3 has 27 destinations, 4 of which exist only because of the seam', () => {
    const queen = fromPiecesSpec('w:Qb3', 'white')

    expect(mirrorDestinations(queen, 'b3')).toEqual(sorted(['h5', 'g6', 'e8', 'h1']))
    expect(movesFrom(queen, 'b3')).toHaveLength(27)
  })

  it('§5.4 the queen crossing set is the union of its rook and bishop crossings', () => {
    const queen = fromPiecesSpec('w:Qb3', 'white')
    const bishop = fromPiecesSpec('w:Bb3', 'white')
    const rook = fromPiecesSpec('w:Rb3', 'white')

    const union = new Set([...mirrorDestinations(bishop, 'b3'), ...mirrorDestinations(rook, 'b3')])
    const queenStandard = new Set(standardDestinations(queen, 'b3'))

    expect(mirrorDestinations(queen, 'b3'))
      .toEqual(sorted([...union].filter(sq => !queenStandard.has(sq))))
    // The rook contributes nothing: both of its rank rays sweep the whole rank, so every
    // crossing has a standard twin and dedupe keeps the standard one (spec §4, dedupe).
    expect(mirrorDestinations(rook, 'b3')).toEqual([])
  })
})

describe('mirror portal §4 — the crossing rule', () => {
  it('a piece on the edge file wraps on its very first step', () => {
    // Bishop a4: NW wraps immediately to h5 and runs on g6, f7, e8; SW wraps to h3, g2, f1.
    const s = fromPiecesSpec('w:Ba4', 'white')

    // e8 is also reached by the NE ray (b5, c6, d7, e8), so its crossing copy dedupes.
    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h5', 'g6', 'f7', 'h3', 'g2', 'f1']))
    expect(standardDestinations(s, 'a4')).toEqual(sorted(['b5', 'c6', 'd7', 'e8', 'b3', 'c2', 'd1']))
  })

  it('the ray continues on its own diagonal, never along the rank', () => {
    const s = fromPiecesSpec('w:Bb3', 'white')
    const mirrors = mirrorDestinations(s, 'b3')

    // The NW ray resumes from h5 as g6, f7, e8 — it does not slide h5, g5, f5…
    expect(mirrors).not.toContain('g5')
    expect(mirrors).not.toContain('f5')
  })

  it('a ray that runs out of ranks ends there — a bishop on d4 gains nothing at all', () => {
    // Every diagonal from d4 reaches a corner: NE ends on h8 with no wrap needed, and NW
    // (c5, b6, a7) wraps to h8 — which the NE ray already offers, so it dedupes away.
    const s = fromPiecesSpec('w:Bd4', 'white')

    expect(mirrorDestinations(s, 'd4')).toEqual([])
    expect(standardDestinations(s, 'd4')).toEqual(
      sorted(['e5', 'f6', 'g7', 'h8', 'c5', 'b6', 'a7', 'c3', 'b2', 'a1', 'e3', 'f2', 'g1']),
    )
  })

  it('vertical rays never cross even when the file is wide open', () => {
    // Both horizontal rays are blocked immediately; the d-file is empty top to bottom.
    const s = fromPiecesSpec('w:Rd4; b:Pc4,Pe4', 'white')

    expect(mirrorDestinations(s, 'd4')).toEqual([])
    expect(standardDestinations(s, 'd4')).toEqual(
      sorted(['c4', 'e4', 'd5', 'd6', 'd7', 'd8', 'd3', 'd2', 'd1']),
    )
  })

  it('a ray crosses at most one seam — it stops rather than wrapping twice', () => {
    // Rook a4 wraps to h4 and slides left until the enemy on b4; it must not carry on
    // through the seam a second time.
    const s = fromPiecesSpec('w:Ra4; b:Pb4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h4', 'g4', 'f4', 'e4', 'd4', 'c4']))
    expect(standardDestinations(s, 'a4')).toContain('b4')
  })

  it('§7 a ray is at most 7 squares long — the same bound as chess, for all 64 origins', () => {
    const board = emptyBoard()

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        for (const [df, dr] of QUEEN_DIRECTIONS) {
          const ray = walkRay(board, { f, r }, df, dr, true)

          expect(ray.length, `${algebraic({ f, r })} direction ${df},${dr}`).toBeLessThanOrEqual(7)
          // At most one crossing: once the ray wraps it stays wrapped, so the crossed
          // flag is monotonic and cannot describe a second seam.
          const firstCrossing = ray.findIndex(step => step.crossed)
          if (firstCrossing >= 0) {
            expect(ray.slice(firstCrossing).every(step => step.crossed)).toBe(true)
          }
        }
      }
    }
  })
})

describe('mirror portal §6 — occupancy and capture', () => {
  it('a piece at the seam stops the ray, exactly as a piece anywhere else would', () => {
    const s = fromPiecesSpec('w:Rd4; b:Pa4', 'white')

    expect(standardDestinations(s, 'd4')).toContain('a4')
    // The eastward ray reaches h4 and wraps onto a4 — already a standard capture.
    expect(mirrorDestinations(s, 'd4')).toEqual([])
  })

  it('an own piece on the path to the seam blocks the crossing', () => {
    const s = fromPiecesSpec('w:Rd4,Pb4,Pf4', 'white')

    expect(mirrorDestinations(s, 'd4')).toEqual([])
  })

  it('the walk stops at the first piece past the seam and captures it when it is an enemy', () => {
    const s = fromPiecesSpec('w:Ra4; b:Pe4,Pc4', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(sorted(['h4', 'g4', 'f4', 'e4']))
  })

  it('a crossing move never lands on an own piece', () => {
    const s = fromPiecesSpec('w:Ra4,Pe4; b:Pc4', 'white')
    const mirrors = mirrorDestinations(s, 'a4')

    expect(mirrors).toEqual(sorted(['h4', 'g4', 'f4']))
    expect(mirrors).not.toContain('e4')
  })

  it('the origin square terminates a wrapped rank ray', () => {
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

  it('§11.2 a pawn push never wraps, so a lone edge pawn has no crossing move', () => {
    const s = fromPiecesSpec('w:Pa3', 'white')

    expect(standardDestinations(s, 'a3')).toEqual(['a4'])
    expect(mirrorDestinations(s, 'a3')).toEqual([])
  })

  it('§11.4 a pawn capture diagonal does wrap, given something to capture', () => {
    const s = fromPiecesSpec('w:Pa4; b:Rh5', 'white')

    expect(mirrorDestinations(s, 'a4')).toEqual(['h5'])
  })

  it('§11.5 a king and a bishop on a4 now agree: both step north-west to h5', () => {
    // Before 2026-10-03 the bishop emerged on h4 and this test asserted the divergence.
    // One crossing rule means there is nothing left to diverge (spec §11.1, §11.5).
    expect(mirrorDestinations(fromPiecesSpec('w:Ka4', 'white'), 'a4')).toContain('h5')
    expect(mirrorDestinations(fromPiecesSpec('w:Ba4', 'white'), 'a4')).toContain('h5')
    expect(mirrorDestinations(fromPiecesSpec('w:Ba4', 'white'), 'a4')).not.toContain('h4')
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

  it('superset: the seam never removes a standard destination (bishop)', () => {
    const s = fromPiecesSpec('w:Bc1; b:Pe3', 'white')

    expect(standardDestinations(s, 'c1')).toEqual(sorted(['d2', 'e3', 'b2', 'a3']))
  })

  it('superset: the seam never removes a standard destination (rook)', () => {
    const s = fromPiecesSpec('w:Rd4; b:Pb4,Pf4', 'white')

    expect(standardDestinations(s, 'd4')).toEqual(
      sorted(['e4', 'f4', 'c4', 'b4', 'd5', 'd6', 'd7', 'd8', 'd3', 'd2', 'd1']),
    )
  })

  /**
   * **Parity is unbroken** (spec §7, new 2026-10-03). A wrapping step changes the file by
   * `±7`, which has the same parity as `±1`, so `(f + r) mod 2` behaves exactly as it
   * would on an unbounded board. These three tests are the whole of that invariant, and
   * they replace "no rank change on the hop" — which was precise, tested, passing, and a
   * transcription of the bug.
   */
  it('a bishop is colour-bound: from all 64 squares, every destination is its own colour', () => {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const from = algebraic({ f, r })
        const s = fromPiecesSpec(`w:B${from}`, 'white', RULES_ALL_ON)
        const destinations = movesFrom(s, from).map(m => algebraic(m.to))

        expect(destinations.length, `bishop on ${from} should have moves`).toBeGreaterThan(0)
        for (const to of destinations) {
          expect(squareColour(to), `B${from} → ${to} changes square colour`)
            .toBe(squareColour(from))
        }
      }
    }
  })

  it('a knight always changes square colour, crossing or not', () => {
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const from = algebraic({ f, r })
        const s = fromPiecesSpec(`w:N${from}`, 'white', RULES_ALL_ON)

        for (const move of movesFrom(s, from)) {
          expect(squareColour(algebraic(move.to)), `N${from} → ${algebraic(move.to)}`)
            .not.toBe(squareColour(from))
        }
      }
    }
  })

  it('a rook\'s rank crossing DOES change colour — the invariant is about parity, not colour', () => {
    // Stated as a test so nobody "tidies" §7 into the false general claim that a crossing
    // never changes square colour. For a rank ray dr = 0, so the file moves ±7 alone and
    // parity flips. It matters nowhere in play: a rook is not colour-bound.
    const s = fromPiecesSpec('w:Ra4; b:Pc4', 'white')

    expect(mirrorDestinations(s, 'a4')).toContain('h4')
    expect(squareColour('h4')).not.toBe(squareColour('a4'))
  })

  it('all flags off reproduces chess exactly, for every piece on a crowded edge', () => {
    // The external oracle in miniature: with the seam closed, nothing wraps. perft.test.ts
    // proves this at scale against published counts; this proves it where it would show.
    const spec = 'w:Ba4,Rh4,Qa1,Na3,Ka6,Pa2; b:Ph7'

    for (const square of ['a4', 'h4', 'a1', 'a3', 'a6', 'a2']) {
      const chess = movesFrom(fromPiecesSpec(spec, 'white', RULES_STANDARD_CHESS), square)

      expect(chess.filter(m => m.crossedSeam)).toEqual([])
    }
  })
})
