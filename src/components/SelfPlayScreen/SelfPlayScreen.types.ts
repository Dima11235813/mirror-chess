import type { GameState, Move } from '@game/types'
import type { RuleSet } from '@game/rules'
import type { DifficultyId } from '@engine/host/levels'

/**
 * One move, with everything the engine knew when it chose it.
 *
 * This is the row the screen exists to show. A move alone says what happened; the score,
 * the line it expected and the number of moves it could not tell apart say *why* — and
 * today the last of those is the interesting one.
 */
export interface WatchedMove {
  /** 1-based halfmove number, so the log reads like a game. */
  readonly ply: number
  readonly move: Move
  /** Coordinate notation with the `*` seam marker, per spec §8.5. */
  readonly coordinate: string
  /** Centipawns, from the moving side's point of view. */
  readonly score: number
  /** Deepest iteration the engine completed. */
  readonly depth: number
  readonly nodes: number
  readonly elapsedMs: number
  /** The line the engine expected, starting with the move it played. */
  readonly pv: readonly string[]
  /** Legal moves in the position it moved from, and how many tied on static evaluation. */
  readonly legalMoves: number
  readonly indistinguishable: number
}

/**
 * Ask an engine for a move.
 *
 * A **function**, not a client, so the screen can be driven deterministically in a test:
 * jsdom has no `Worker`, and a component that constructed its own would be untestable
 * without mocking the module. The default is the real worker-backed client.
 */
export type ThinkFn = (state: GameState, difficulty: DifficultyId) => Promise<{
  readonly move: Move | null
  readonly score: number
  readonly depth: number
  readonly nodes: number
  readonly elapsedMs: number
  readonly pv?: readonly Move[]
} | null>

export interface SelfPlayScreenProps {
  /** The rules both sides play. One ruleset per game — see `self-play-harness.md` §1. */
  readonly rules: RuleSet
  /** Engine strength for **both** sides; an uneven match measures the handicap, not the game. */
  readonly difficulty: DifficultyId
  /** Injected for tests. Defaults to the worker-backed engine client. */
  readonly think?: ThinkFn
  /** Start playing immediately. Off by default: a screen that starts working unasked is rude. */
  readonly autoPlay?: boolean
}
