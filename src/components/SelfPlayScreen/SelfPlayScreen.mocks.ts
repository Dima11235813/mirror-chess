import { allLegalMoves } from '@game/status'
import type { GameState } from '@game/types'
import type { ThinkFn } from './SelfPlayScreen.types'

/**
 * A stand-in engine for the screen's tests.
 *
 * **Not a mock of the search** — it plays a *real legal move*, chosen deterministically as
 * the first the generator offers. That matters: the screen applies what it is given through
 * `reduceMove`, so an invented move would be rejected by the rules and the test would be
 * exercising a path no engine can produce. jsdom has no `Worker`, which is why the screen
 * takes `think` as a prop at all.
 */
export function fakeEngine(options: { readonly delayMs?: number } = {}): ThinkFn {
  return async (state: GameState) => {
    const moves = allLegalMoves(state, state.turn)
    if (options.delayMs) await new Promise(resolve => setTimeout(resolve, options.delayMs))
    const move = moves[0]
    return move
      ? { move, score: 0, depth: 2, nodes: 1234, elapsedMs: 5, pv: [move] }
      : null
  }
}

/** An engine that fails, so the screen's error path can be driven. */
export function brokenEngine(message = 'worker exploded'): ThinkFn {
  return async () => { throw new Error(message) }
}
