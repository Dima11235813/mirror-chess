import { PUZZLE_SCHEMA, type Puzzle } from '@/puzzles/types'
import { TOKEN_ALL_ON, type RuleSetToken } from '@game/rules'

/**
 * Puzzles for the screen's tests.
 *
 * **Real mined puzzles with the miner's own feature values, not invented ones.** Both come from
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
  chessDifferential: 'no-mate-in-chess',
  difficulty: 'medium',
  features: { keyMoveQuiet: false, forcingMoves: 4, defences: 1, travel: 4, goalMoves: 2, crossedSeam: true, score: 3 },
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
  chessDifferential: 'no-mate-in-chess',
  difficulty: 'medium',
  features: { keyMoveQuiet: false, forcingMoves: 27, defences: 1, travel: 4, goalMoves: 2, crossedSeam: true, score: 4 },
  solution: { from: 'f1', to: 'c5', promotion: null, crossedSeam: true, coordinate: 'f1-c5*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20260925,
}

export const TWO_PUZZLES: readonly Puzzle[] = [SEAM_PUZZLE, SECOND_PUZZLE]

/**
 * A mate in 3 whose key move crosses the seam, banded **hard**.
 *
 * Mined 2026-09-26. Its features are the miner's own output, not hand-written: a record
 * invented here would test the screen against a fiction.
 */
export const MATE_IN_3_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '0u32ec8',
  fen: '2k3B1/8/8/5B2/8/1n6/6K1/8 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-3',
  material: 'KBB-KN',
  chessDifferential: 'no-mate-in-chess',
  difficulty: 'hard',
  features: { keyMoveQuiet: false, forcingMoves: 28, defences: 1, travel: 5, goalMoves: 3, crossedSeam: true, score: 7 },
  solution: { from: 'g8', to: 'b6', promotion: null, crossedSeam: true, coordinate: 'g8-b6*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20260926,
}

/**
 * An **ordinary chess tactic** that happens to live here: the same quiet king move mates
 * under both rulesets.
 *
 * These exist in the library on purpose since 2026-09-26. A set where the seam always
 * matters is one a player can predict, and predictability is what spoils it.
 */
export const CHESS_TACTIC_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '1suvz1m',
  fen: '3k4/3K4/2B5/8/1p6/8/R7/8 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-2',
  material: 'KRB-KP',
  chessDifferential: 'same-mate-in-chess',
  difficulty: 'medium',
  features: { keyMoveQuiet: true, forcingMoves: 1, defences: 2, travel: 1, goalMoves: 2, crossedSeam: false, score: 4 },
  solution: { from: 'd7', to: 'd6', promotion: null, crossedSeam: false, coordinate: 'd7-d6' },
  unique: true,
  mateInChess: true,
  source: 'composed',
  seed: 777,
}
