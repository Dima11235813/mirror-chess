import { PUZZLE_SCHEMA, type Puzzle } from '@/puzzles/types'
import { TOKEN_ALL_ON, type RuleSetToken } from '@game/rules'

/**
 * Puzzles for the screen's tests.
 *
 * **Real mined puzzles with the miner's own feature values, not invented ones.** All four
 * are copied verbatim from `puzzles/puzzles.v3.json` (seed 20261003), so a component test
 * cannot pass against a position whose solution is wrong. Inventing a fixture here would
 * test the screen against a fiction.
 *
 * Replaced wholesale on 2026-10-03: the previous four came from the pre-revision set and
 * every one of them lost its forced mate when the seam crossing changed
 * (`prj-mgmt/epics/rules/diagonal-crossing.md` M4). Two things about the replacements are
 * worth knowing, because they shape what these tests can check:
 *
 * - **Every seam solution in the new library is a quiet move.** There are no seam
 *   *captures* in 248 puzzles — sparse material plus a colour-preserving crossing means a
 *   crossing ray rarely meets anything. The "mirror capture" cue is still covered, by
 *   hand-built fixtures in `prj-mgmt/epics/rules/piece-capabilities.e2e.ts`.
 * - **Three of the four key moves cross the seam, and two of those are a *king* walking
 *   off one edge of the board and onto the other** — which is the showcase shape now that
 *   the lone-bishop mate is gone.
 */

/**
 * `Ba1-d6*`: the bishop's north-west ray wraps on its **first** step and runs
 * `h2, g3, f4, e5, d6`. Mate in two, and no mate at all in chess.
 */
export const SEAM_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '0lehvlg',
  fen: '8/6Rp/8/8/8/1K6/8/B6k w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-2',
  material: 'KRB-KP',
  chessDifferential: 'no-mate-in-chess',
  difficulty: 'medium',
  features: { keyMoveQuiet: true, forcingMoves: 2, defences: 2, travel: 5, goalMoves: 2, crossedSeam: true, score: 6 },
  solution: { from: 'a1', to: 'd6', promotion: null, crossedSeam: true, coordinate: 'a1-d6*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20261003,
}

/** A second puzzle, so "next" has somewhere to go: `Ka4-h3*`, the king crossing the seam. */
export const SECOND_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '1f7em97',
  fen: '8/8/8/8/K7/8/3Q4/5k2 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-2',
  material: 'KQ-K',
  chessDifferential: 'no-mate-in-chess',
  difficulty: 'hard',
  features: { keyMoveQuiet: true, forcingMoves: 9, defences: 1, travel: 7, goalMoves: 2, crossedSeam: true, score: 7 },
  solution: { from: 'a4', to: 'h3', promotion: null, crossedSeam: true, coordinate: 'a4-h3*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20261003,
}

export const TWO_PUZZLES: readonly Puzzle[] = [SEAM_PUZZLE, SECOND_PUZZLE]

/**
 * A mate in 3 whose key move crosses the seam, banded **hard**.
 *
 * `Kh7-a6*`: the white king steps off the h-file and arrives on the a-file, two bishops
 * doing the mating. Impossible in chess twice over — the move does not exist there, and
 * neither does the mate.
 */
export const MATE_IN_3_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '1woznlv',
  fen: '2k5/7K/8/B7/8/8/6B1/8 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-3',
  material: 'KBB-K',
  chessDifferential: 'no-mate-in-chess',
  difficulty: 'hard',
  features: { keyMoveQuiet: true, forcingMoves: 4, defences: 1, travel: 7, goalMoves: 3, crossedSeam: true, score: 9 },
  solution: { from: 'h7', to: 'a6', promotion: null, crossedSeam: true, coordinate: 'h7-a6*' },
  unique: true,
  mateInChess: false,
  source: 'composed',
  seed: 20261003,
}

/**
 * An **ordinary chess tactic** that happens to live here: the same quiet rook move mates
 * under both rulesets.
 *
 * These exist in the library on purpose since 2026-09-26. A set where the seam always
 * matters is one a player can predict, and predictability is what spoils it.
 */
export const CHESS_TACTIC_PUZZLE: Puzzle = {
  schema: PUZZLE_SCHEMA,
  id: '1h4nagf',
  fen: '1k6/8/8/3R4/8/8/2R4K/8 w - - 0 1',
  ruleset: TOKEN_ALL_ON as RuleSetToken,
  sideToMove: 'white',
  goal: 'mate-in-2',
  material: 'KRR-K',
  chessDifferential: 'same-mate-in-chess',
  difficulty: 'medium',
  features: { keyMoveQuiet: true, forcingMoves: 4, defences: 1, travel: 2, goalMoves: 2, crossedSeam: false, score: 5 },
  solution: { from: 'd5', to: 'd7', promotion: null, crossedSeam: false, coordinate: 'd5-d7' },
  unique: true,
  mateInChess: true,
  source: 'composed',
  seed: 20261003,
}
