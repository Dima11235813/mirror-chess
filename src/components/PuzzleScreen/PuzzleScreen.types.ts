import type { Puzzle } from '@/puzzles/types'

/** What the screen is told. Nothing about *which* puzzles exist — the shell decides that. */
export interface PuzzleScreenProps {
  /** The puzzles to work through, in order. Never empty. */
  readonly puzzles: readonly Puzzle[]
  /** Where to start, so a link can open one puzzle. Clamped into range. */
  readonly startIndex?: number
}

/**
 * How far the player has got with the puzzle in front of them.
 *
 * `wrong` is not a failure state — it is a retry, and the board goes back to the puzzle's
 * position rather than playing the move out. This is a *mate in two*: the claim being
 * tested is that exactly one first move forces it, so a wrong move has nothing to show.
 */
export type SolveState = 'thinking' | 'wrong' | 'solved'
