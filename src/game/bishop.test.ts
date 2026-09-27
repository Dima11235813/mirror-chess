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
  it('Bc1 portals left through a3 and right through h6 (spec §5.2)', () => {
    const s = fromPiecesSpec('w:Bc1', 'white')

    expect(mirrorDestinations(s, 'c1')).toEqual(
      sorted(['h3', 'g4', 'f5', 'e6', 'd7', 'c8', 'a6', 'b7']),
    )
  })

  it('Bc1 can capture an enemy on the far side of a seam', () => {
    // The NE ray reaches the h-file at h6 and re-enters at a6, where the knight sits.
    const s = fromPiecesSpec('w:Bc1; b:Na6', 'white')
    const mirrors = mirrorDestinations(s, 'c1')

    expect(mirrors).toContain('a6')
    // The far-side walk stops on the capture, so b7 and c8 beyond it are unreachable.
    expect(mirrors).not.toContain('b7')
  })

  it('Bc1 cannot portal when a blocker sits on the ray before the seam', () => {
    const s = fromPiecesSpec('w:Bc1,Ng5', 'white')
    const mirrors = mirrorDestinations(s, 'c1')

    // The NE ray is blocked at g5, so the right-hand portal (a6,b7,c8) is gone;
    // the NW ray still portals through a3.
    expect(mirrors).not.toContain('a6')
    expect(mirrors).not.toContain('b7')
    expect(mirrors).toEqual(sorted(['h3', 'g4', 'f5', 'e6', 'd7', 'c8']))
  })

  it('Bc1 cannot portal onto its own piece', () => {
    const s = fromPiecesSpec('w:Bc1,Pa6', 'white')

    expect(mirrorDestinations(s, 'c1')).not.toContain('a6')
  })
})
