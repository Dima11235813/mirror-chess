/**
 * PUZZLE DIFFICULTY — computable features, and a band you are allowed to disbelieve.
 *
 * **What is this?** A handful of structural features of a puzzle, and a coarse band —
 * easy, medium or hard — derived from them.
 *
 * **Why is it here?** Because a mined library is an undifferentiated pile without it, and
 * because the alternative is worse. Difficulty *cannot* be predicted from a position to
 * useful accuracy: the state of the art trains on 4.2M rated puzzles and still lands at a
 * mean absolute error of ~259 Glicko points, and the principled method — predicting which
 * move a human of a given strength plays — needs millions of human games in the variant
 * being modelled, of which Mirror Chess has none
 * (`prj-mgmt/research/puzzle-difficulty-and-novelty.md`).
 *
 * So this module deliberately does **not** produce a rating. It produces named features a
 * reader can check and three bands, which is all an uncalibrated score can honestly carry.
 * Every weight below states its provenance the way every constant in this repo does
 * (CLAUDE.md §12): **cited**, **measured**, or **guessed**.
 *
 * **What is subtle?** Two things, both of which would quietly make the score wrong:
 *
 * 1. **Seam crossing is not in the band.** It is reported as its own dimension. A player
 *    meeting this variant finds every seam move hard, and after fifty puzzles looks for
 *    seam moves first — so it measures *unfamiliarity*, which decays. Quiet-move difficulty
 *    does not decay that way. Folding a decaying signal into a fixed score gives a number
 *    that silently stops being true.
 * 2. **These are chess intuitions applied to a variant that keeps falsifying chess
 *    intuitions** — the bishop pair, piece-square tables, "king and minor cannot mate".
 *    Treat every weight as a hypothesis awaiting solve data, not as knowledge.
 */
import { allLegalMoves } from '../game/status'
import { reduceMove } from '../game/reducer'
import { isInCheck } from '../game/attacks'
import type { GameState, Move } from '../game/types'

/** How hard a puzzle looks, on the only scale an uncalibrated score can support. */
export type DifficultyBand = 'easy' | 'medium' | 'hard'

/** The measurable things about a puzzle that plausibly bear on how hard it is. */
export interface DifficultyFeatures {
  /** The key move gives no check and takes nothing — the hardest kind to see. */
  readonly keyMoveQuiet: boolean
  /** Checks and captures available at the root: the moves a player examines first. */
  readonly forcingMoves: number
  /** Legal replies after the key move. One reply is barely a puzzle. */
  readonly defences: number
  /** Chebyshev distance the piece travels. A piece arriving from far away is easy to miss. */
  readonly travel: number
  /** How many of the solver's moves the mate takes. */
  readonly goalMoves: number
  /** Reported, never scored — see the module note. */
  readonly crossedSeam: boolean
  /** The total the band is cut from. Exposed so a band can be argued with. */
  readonly score: number
}

/**
 * Points per feature.
 *
 * **Provenance, per line, because an unlabelled weight becomes load-bearing by accident:**
 */
const POINTS = {
  /** **Cited.** The tactical literature's strongest and most consistent signal: players
   *  search checks and captures first, so a quiet key move is filtered out by habit. */
  quietKeyMove: 3,
  /** **Cited.** Candidate-move load — how much forcing noise must be rejected first.
   *  Log-scaled because the 30th check is not as costly as the 3rd. */
  forcingLoadMax: 3,
  /** **Measured.** 107 of our first 161 puzzles gave exactly one defence, which is barely a
   *  two-move puzzle. Real defensive choice is what makes the calculation real. */
  perDefenceOverOne: 1,
  defenceMax: 2,
  /** **Guessed**, flagged for calibration against solve data. */
  longTravel: 1,
  /** **Cited.** Depth of calculation: holding a longer forced line is the other classic
   *  axis, and it is why mate in 3 was worth mining at 10–40× the cost. */
  perGoalMoveOverTwo: 3,
} as const

/** Band thresholds on the total score. **Guessed**, and the first thing solve data should move. */
const BANDS = { easyBelow: 3, mediumBelow: 7 } as const

/** A check or a capture: what a player looks at first. */
function isForcing(state: GameState, move: Move): boolean {
  if (move.flag === 'capture' || move.flag === 'promotionCapture') return true
  const after = reduceMove(state, move)
  return after !== state && isInCheck(after, after.turn)
}

/**
 * Measure a puzzle's difficulty features.
 *
 * @param state The puzzle position, under the puzzle's own ruleset. Never mutated.
 * @param solution The key move, as generated for this position.
 * @param goalMoves How many of the solver's moves the mate takes (2 or 3).
 * @returns The features, including the score the band is cut from.
 */
export function measureDifficulty(state: GameState, solution: Move, goalMoves: number): DifficultyFeatures {
  const moves = allLegalMoves(state, state.turn)
  const forcingMoves = moves.filter(m => isForcing(state, m)).length

  const after = reduceMove(state, solution)
  const gaveCheck = after !== state && isInCheck(after, after.turn)
  const captured = solution.flag === 'capture' || solution.flag === 'promotionCapture'
  const keyMoveQuiet = !gaveCheck && !captured
  const defences = after === state ? 0 : allLegalMoves(after, after.turn).length

  // Board distance, not the distance the piece actually travelled: a seam crossing looks
  // short in coordinates and long on screen. Either way it proxies "easy to overlook",
  // and the seam is reported separately rather than scored.
  const travel = Math.max(
    Math.abs(solution.from.f - solution.to.f),
    Math.abs(solution.from.r - solution.to.r),
  )

  let score = 0
  if (keyMoveQuiet) score += POINTS.quietKeyMove
  // log2 of the forcing count, capped: rejecting 4 checks is work, rejecting 30 is not
  // eight times the work.
  score += Math.min(POINTS.forcingLoadMax, Math.floor(Math.log2(Math.max(1, forcingMoves))))
  score += Math.min(POINTS.defenceMax, Math.max(0, defences - 1) * POINTS.perDefenceOverOne)
  if (travel >= 4) score += POINTS.longTravel
  score += Math.max(0, goalMoves - 2) * POINTS.perGoalMoveOverTwo

  return {
    keyMoveQuiet,
    forcingMoves,
    defences,
    travel,
    goalMoves,
    crossedSeam: solution.crossedSeam,
    score,
  }
}

/**
 * Cut a band from a score.
 *
 * Three bands, because that is what an uncalibrated score can carry. The claim being made
 * is only that the bands *order* puzzles roughly — which is falsifiable against solve data,
 * unlike a rating.
 */
export function bandOf(features: DifficultyFeatures): DifficultyBand {
  if (features.score < BANDS.easyBelow) return 'easy'
  if (features.score < BANDS.mediumBelow) return 'medium'
  return 'hard'
}
