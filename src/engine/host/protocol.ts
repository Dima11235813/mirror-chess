import type { GameState, Move } from '@game/types'
import type { Centipawns, Depth, NodeCount } from '../types'

/**
 * THE WORKER PROTOCOL — what the page and the engine say to each other.
 *
 * **What is this?** Two message types in each direction, and the shapes they carry.
 *
 * **Why is it here?** So the contract between the UI and the engine is a *file* rather than
 * an understanding. A worker boundary is the easiest place in a codebase for two halves to
 * drift, because nothing type-checks across a `postMessage` unless something like this
 * exists to be imported by both sides.
 *
 * **How does it work?** `GameState` is passed **as-is**. That is not laziness — it is a
 * property worth noticing: the game core is built from plain objects, arrays, strings,
 * numbers and booleans, with no classes, no functions and no cycles, so it is already
 * *structured-cloneable*. There is no serialisation layer here because purity made one
 * unnecessary (see `docs/design-patterns/functional-core-imperative-shell.md`).
 *
 * **What is subtle?** Every request carries an `id`, and every response echoes it. Without
 * that, a result arriving from a search the user has already cancelled — by resetting,
 * loading a game, or switching sides — would be applied to a board it does not belong to.
 * That is the classic race in this shape of code, and the id is what makes it impossible
 * rather than unlikely.
 */

/** Ask the engine to pick a move. */
export interface SearchRequest {
  readonly type: 'search'
  /** Correlates the reply. A reply whose id is stale must be ignored. */
  readonly id: number
  readonly state: GameState
  readonly maxDepth: Depth
  readonly budgetMs: number
}

/** Ask the engine to stop the current search. It will still reply, with its best so far. */
export interface CancelRequest {
  readonly type: 'cancel'
  readonly id: number
}

export type EngineRequest = SearchRequest | CancelRequest

/** A completed iteration — the engine thinking out loud. */
export interface ProgressMessage {
  readonly type: 'progress'
  readonly id: number
  readonly depth: Depth
  readonly score: Centipawns
  readonly nodes: NodeCount
}

/** The chosen move. `move` is `null` only when the position has no legal move. */
export interface ResultMessage {
  readonly type: 'result'
  readonly id: number
  readonly move: Move | null
  readonly score: Centipawns
  readonly depth: Depth
  readonly nodes: NodeCount
  readonly quiescenceNodes: NodeCount
  readonly elapsedMs: number
}

/** The engine threw. Reported rather than swallowed, so a bug surfaces instead of hanging. */
export interface ErrorMessage {
  readonly type: 'error'
  readonly id: number
  readonly message: string
}

export type EngineResponse = ProgressMessage | ResultMessage | ErrorMessage
