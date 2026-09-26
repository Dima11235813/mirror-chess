import { describe, it, expect } from 'vitest'
import { legalMovesFor } from './moves'
import { fromPiecesSpec } from './setup'
import { algebraic, parseAlgebraic } from './coord'
import type { GameState } from './types'

/**
 * The knight crosses the seam by **L measured across it**
 * (`prj-mgmt/epics/rules/mirror-portal-spec.md` §11): the file of its landing square
 * wraps, the rank is whatever its own L dictates. A knight therefore never loses
 * moves to the left or right edge.
 */

const movesFrom = (state: GameState, square: string) =>
  legalMovesFor(state, parseAlgebraic(square))

const destinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square).map(m => algebraic(m.to)).sort()

const mirrorDestinations = (state: GameState, square: string): string[] =>
  movesFrom(state, square).filter(m => m.crossedSeam).map(m => algebraic(m.to)).sort()

const sorted = (squares: readonly string[]): string[] => [...squares].sort()

describe('knight: away from the seam it is ordinary chess', () => {
  it('a knight on e4 has the eight L-moves and none of them wrap', () => {
    const s = fromPiecesSpec('w:Ne4', 'white')

    expect(destinations(s, 'e4')).toEqual(sorted(['d6', 'f6', 'c5', 'g5', 'c3', 'g3', 'd2', 'f2']))
    expect(mirrorDestinations(s, 'e4')).toEqual([])
  })

  it('a knight jumps over blockers', () => {
    const s = fromPiecesSpec('w:Ne4,Pe5,Pd5,Pf5,Pd4,Pf4', 'white')

    expect(destinations(s, 'e4')).toEqual(sorted(['d6', 'f6', 'c5', 'g5', 'c3', 'g3', 'd2', 'f2']))
  })

  it('a knight can capture an enemy piece', () => {
    expect(destinations(fromPiecesSpec('w:Ne4; b:Pd6', 'white'), 'e4')).toContain('d6')
  })

  it('a knight cannot land on a friendly piece', () => {
    expect(destinations(fromPiecesSpec('w:Ne4,Pd6', 'white'), 'e4')).not.toContain('d6')
  })
})

describe('knight: §11 crossing the seam', () => {
  it('§11.4 a knight on a3 keeps all eight moves, four of them across the seam', () => {
    const s = fromPiecesSpec('w:Na3', 'white')

    expect(destinations(s, 'a3')).toHaveLength(8)
    expect(mirrorDestinations(s, 'a3')).toEqual(sorted(['h5', 'g4', 'g2', 'h1']))
    expect(destinations(s, 'a3')).toEqual(
      sorted(['b5', 'c4', 'c2', 'b1', 'h5', 'g4', 'g2', 'h1']),
    )
  })

  it('§11.4 a knight on h6 crosses the other way', () => {
    const s = fromPiecesSpec('w:Nh6', 'white')

    expect(mirrorDestinations(s, 'h6')).toEqual(sorted(['a8', 'b7', 'b5', 'a4']))
    expect(destinations(s, 'h6')).toEqual(sorted(['g8', 'f7', 'f5', 'g4', 'a8', 'b7', 'b5', 'a4']))
  })

  it('a knight in the corner gains two moves it would not have in standard chess', () => {
    const s = fromPiecesSpec('w:Na1', 'white')

    expect(destinations(s, 'a1')).toEqual(sorted(['b3', 'c2', 'g2', 'h3']))
    expect(mirrorDestinations(s, 'a1')).toEqual(sorted(['g2', 'h3']))
  })

  it('does not land on the file mirror of its own rank — the rejected a3→h3 idea', () => {
    const s = fromPiecesSpec('w:Na3', 'white')

    expect(destinations(s, 'a3')).not.toContain('h3')
  })

  it('ranks never wrap: a knight on a1 gets nothing from rank offsets that leave the board', () => {
    const s = fromPiecesSpec('w:Na1', 'white')

    // (-1,-2) and (-2,-1) would need ranks -1 and -2; no square exists there.
    expect(destinations(s, 'a1')).toHaveLength(4)
  })

  it('a wrapped destination obeys ordinary occupancy — own piece blocks', () => {
    const s = fromPiecesSpec('w:Na3,Ph5', 'white')

    expect(mirrorDestinations(s, 'a3')).toEqual(sorted(['g4', 'g2', 'h1']))
  })

  it('a wrapped destination may capture an enemy', () => {
    const s = fromPiecesSpec('w:Na3; b:Ph5', 'white')

    expect(mirrorDestinations(s, 'a3')).toContain('h5')
  })
})
