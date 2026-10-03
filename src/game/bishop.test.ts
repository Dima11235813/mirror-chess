import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from './setup'
import { legalMovesFor } from './moves'
import { algebraic, parseAlgebraic } from './coord'
import type { GameState } from './types'

/** Bishop behavior per `prj-mgmt/epics/rules/mirror-portal-spec.md` §4–§6. */

const movesFrom = (state: GameState, square: string) =>
  legalMovesFor(state, parseAlgebraic(square))

const standardDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square).filter(m => !m.crossedSeam).map(m => algebraic(m.to)).sort()

const mirrorDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square).filter(m => m.crossedSeam).map(m => algebraic(m.to)).sort()

const sorted = (squares: readonly string[]): string[] => [...squares].sort()

describe('bishop: regular moves and captures', () => {
  it('Bc1 on an empty board: all diagonals open', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')

    expect(standardDestinations(s, 'c1')).toEqual(sorted(['d2', 'e3', 'f4', 'g5', 'h6', 'b2', 'a3']))
  })

  it('Bc1 with a black pawn on e3: captures e3 and stops beyond it', () => {
    const s = fromPiecesSpec('w:Bc1; b:Pe3', 'white')

    expect(standardDestinations(s, 'c1')).toEqual(sorted(['d2', 'e3', 'b2', 'a3']))
  })

  it('Bc1 cannot capture its own piece', () => {
    const s = fromPiecesSpec('w:Bc1,Pe3', 'white')

    expect(standardDestinations(s, 'c1')).toEqual(sorted(['d2', 'b2', 'a3']))
  })
})

describe('bishop: mirror portal', () => {
  it('Bc1 crosses both seams, continuing each diagonal (spec §5.2)', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')

    // NW: b2, a3 | h4, g5, f6, e7, d8   —   NE: d2, e3, f4, g5, h6 | a7, b8
    // g5 is on both rays, so its crossing copy dedupes against the standard one.
    expect(mirrorDestinations(s, 'c1')).toEqual(sorted(['h4', 'f6', 'e7', 'd8', 'a7', 'b8']))
  })

  it('Bc1 can capture an enemy past the seam', () => {
    // The NE ray runs d2, e3, f4, g5, h6 and wraps onto a7, where the knight sits.
    const s = fromPiecesSpec('w:Bc1; b:Na7', 'white')
    const mirrors = mirrorDestinations(s, 'c1')

    expect(mirrors).toContain('a7')
    // The walk stops on the capture, so b8 beyond it is unreachable.
    expect(mirrors).not.toContain('b8')
  })

  it('Bc1 cannot cross when a blocker sits on the ray before the seam', () => {
    const s = fromPiecesSpec('w:Bc1,Nf4', 'white')
    const mirrors = mirrorDestinations(s, 'c1')

    // The NE ray stops at its own knight on f4, so a7 and b8 are gone. The NW ray still
    // crosses — and g5 is now a crossing destination rather than a standard one, because
    // the ray that used to reach it normally no longer gets there.
    expect(mirrors).not.toContain('a7')
    expect(mirrors).not.toContain('b8')
    expect(mirrors).toEqual(sorted(['h4', 'g5', 'f6', 'e7', 'd8']))
  })

  it('Bc1 cannot cross onto its own piece', () => {
    const s = fromPiecesSpec('w:Bc1,Pa7', 'white')

    expect(mirrorDestinations(s, 'c1')).not.toContain('a7')
  })
})
