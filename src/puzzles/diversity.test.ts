import { describe, it, expect } from 'vitest'
import { PUZZLE_SCHEMA, type Puzzle } from './types'
import { TOKEN_ALL_ON, type RuleSetToken } from '../game/rules'
import { describe as describePuzzle, distance, materialIndex, noveltyScores, spreadOrder } from './diversity'

/** A puzzle stripped to the fields diversity reads, so a test reads as what it varies. */
function puzzleLike(overrides: {
  id: string
  material?: string
  quiet?: boolean
  seam?: boolean
  defences?: number
  travel?: number
  goalMoves?: number
}): Puzzle {
  const goalMoves = overrides.goalMoves ?? 2
  return {
    schema: PUZZLE_SCHEMA,
    id: overrides.id,
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    ruleset: TOKEN_ALL_ON as RuleSetToken,
    sideToMove: 'white',
    goal: goalMoves === 3 ? 'mate-in-3' : 'mate-in-2',
    material: overrides.material ?? 'KBB-KN',
    chessDifferential: 'no-mate-in-chess',
    difficulty: 'medium',
    features: {
      keyMoveQuiet: overrides.quiet ?? false,
      forcingMoves: 5,
      defences: overrides.defences ?? 1,
      travel: overrides.travel ?? 2,
      goalMoves,
      crossedSeam: overrides.seam ?? false,
      score: 3,
    },
    solution: { from: 'a1', to: 'a2', promotion: null, crossedSeam: overrides.seam ?? false, coordinate: 'a1-a2' },
    unique: true,
    mateInChess: false,
    source: 'composed',
    seed: 1,
  }
}

describe('the descriptor', () => {
  it('describes how a puzzle is solved, not only what is on the board', () => {
    // Two puzzles can share material and be quite different puzzles; it is the solution
    // that decides, so the descriptor has to carry it.
    const index = materialIndex([puzzleLike({ id: 'a' })])
    const forcing = describePuzzle(puzzleLike({ id: 'a', quiet: false, seam: false }), index)
    const quietSeam = describePuzzle(puzzleLike({ id: 'b', quiet: true, seam: true }), index)

    expect(distance(forcing, quietSeam)).toBeGreaterThan(0)
  })

  it('places identical puzzles at zero distance', () => {
    const index = materialIndex([puzzleLike({ id: 'a' })])
    const one = describePuzzle(puzzleLike({ id: 'a' }), index)
    const same = describePuzzle(puzzleLike({ id: 'b' }), index)

    expect(distance(one, same)).toBe(0)
  })
})

describe('novelty scores', () => {
  it('scores a near-duplicate far below an outlier', () => {
    // A crowd of identical puzzles and one unlike anything else: the outlier must win, or
    // the score cannot do the job it exists for — surfacing the 7% worth showing.
    //
    // The crowd is deliberately larger than k. With k=5 and only four other puzzles, every
    // puzzle's neighbourhood includes the outlier, so nothing scores zero and the property
    // under test is not the one being measured.
    const crowd = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => puzzleLike({ id }))
    const outlier = puzzleLike({
      id: 'outlier', material: 'KQ-K', quiet: true, seam: true, defences: 6, travel: 7, goalMoves: 3,
    })
    const scores = noveltyScores([...crowd, outlier])

    const crowdScores = scores.slice(0, crowd.length)
    const outlierScore = scores[crowd.length]!

    expect(Math.max(...crowdScores)).toBeLessThan(outlierScore)
    // Each crowd member has k identical neighbours, so its mean distance is exactly zero.
    expect(crowdScores.every(s => s === 0)).toBe(true)
  })

  it('returns one score per puzzle, and survives a tiny set', () => {
    expect(noveltyScores([puzzleLike({ id: 'a' })])).toHaveLength(1)
    expect(noveltyScores([puzzleLike({ id: 'a' }), puzzleLike({ id: 'b', quiet: true })])).toHaveLength(2)
  })
})

describe('spread order', () => {
  it('breaks up a run of identical puzzles', () => {
    // The failure it exists to prevent: 33 of the first 161 puzzles were the same motif,
    // so a player meets four in a row by accident.
    const puzzles = [
      puzzleLike({ id: 'same1' }),
      puzzleLike({ id: 'same2' }),
      puzzleLike({ id: 'same3' }),
      puzzleLike({ id: 'seam', seam: true, quiet: true }),
      puzzleLike({ id: 'deep', goalMoves: 3, material: 'KQ-K' }),
    ]
    const order = spreadOrder(puzzles)
    const ids = order.map(i => puzzles[i]!.id)

    // Every puzzle appears exactly once.
    expect(new Set(ids).size).toBe(puzzles.length)
    // The three identical ones are not all adjacent at the front.
    const firstThree = ids.slice(0, 3).filter(id => id.startsWith('same')).length
    expect(firstThree).toBeLessThan(3)
  })

  it('starts from the most novel puzzle', () => {
    const puzzles = [
      puzzleLike({ id: 'crowd1' }),
      puzzleLike({ id: 'crowd2' }),
      puzzleLike({ id: 'crowd3' }),
      puzzleLike({ id: 'odd', material: 'KQ-K', quiet: true, seam: true, goalMoves: 3, defences: 6 }),
    ]
    const order = spreadOrder(puzzles)

    expect(puzzles[order[0]!]!.id).toBe('odd')
  })

  it('is a permutation, for any set', () => {
    for (const size of [1, 2, 3, 9]) {
      const puzzles = Array.from({ length: size }, (_x, i) =>
        puzzleLike({ id: `p${i}`, travel: i % 7, defences: (i % 5) + 1 }))
      const order = spreadOrder(puzzles)

      expect([...order].sort((a, b) => a - b)).toEqual(puzzles.map((_p, i) => i))
    }
  })
})
