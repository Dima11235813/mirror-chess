/**
 * WORKING WITH ONE PUZZLE — the helpers a player-facing screen needs.
 *
 * **Why is this separate from `set.ts`?** Because `set.ts` imports the committed library,
 * and a component that only needs to *open* a puzzle should not depend on the shipped file
 * existing. Splitting them means the screen's tests run against puzzles passed as props,
 * and a re-mine cannot break a component test.
 */
import { parseFen } from '../game/fen'
import { parseRuleSetToken, rulesOf } from '../game/rules'
import type { GameState } from '../game/types'
import type { Puzzle } from './types'

/**
 * The position a puzzle starts from, under **its own** ruleset.
 *
 * A puzzle's ruleset is part of its identity: the same board under a different token is a
 * different puzzle, usually with a different answer. So a position is never built with the
 * default rules.
 *
 * @param puzzle The puzzle to open.
 * @returns A fresh `GameState`, never shared between callers.
 */
export function positionOf(puzzle: Puzzle): GameState {
  return parseFen(puzzle.fen, rulesOf(parseRuleSetToken(puzzle.ruleset)))
}

/**
 * Is this move the puzzle's answer?
 *
 * Compares origin and destination only. `crossedSeam` is deliberately excluded, exactly as
 * `reduceMove` excludes it: it is presentation, and dedupe guarantees at most one move per
 * destination, so two moves cannot share from/to and differ only in having crossed.
 * Promotion is compared, because a different piece is a different move.
 */
export function isSolution(
  puzzle: Puzzle,
  move: { from: string; to: string; promotion: string | null },
): boolean {
  return move.from === puzzle.solution.from &&
    move.to === puzzle.solution.to &&
    move.promotion === puzzle.solution.promotion
}
