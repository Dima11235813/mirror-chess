import { PUZZLE_SCHEMA, type Puzzle } from '@/puzzles/types'
import { TOKEN_ALL_ON, type RuleSetToken } from '@game/rules'

/**
 * Puzzles for the screen's tests.
 *
 * **Real mined puzzles, not invented ones.** Both come from
 * `puzzles/mate-in-2.v1.json` (seed 20260925) and are pinned in
 * `src/puzzles/mate.test.ts`, so a component test cannot pass against a position whose
 * solution is wrong. Inventing a fixture here would test the screen against a fiction.
 */

/** `Bf8-c4*`: the bishop slides right through h6, wraps to a6 and returns along b5. */
export const SEAM_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '1b53rpm',
  fen: '5Bk1/8/8/6K1/2n5/2B5/8/8 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-2',
  material: 'KBB-KN',
  solution: { from: 'f8', to: 'c4', promotion: null, crossedSeam: true, coordinate: 'f8-c4*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20260925,
}

/** A second puzzle, so "next" has somewhere to go. */
export const SECOND_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '0rxc7yu',
  fen: '5n2/8/K3B3/8/8/8/8/5Bk1 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-2',
  material: 'KBB-KN',
  solution: { from: 'f1', to: 'c5', promotion: null, crossedSeam: true, coordinate: 'f1-c5*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20260925,
}

export const TWO_PUZZLES: readonly Puzzle[] = [SEAM_PUZZLE, SECOND_PUZZLE]
