/// <reference lib="webworker" />
import { search } from '../search'
import type { EngineRequest, EngineResponse } from './protocol'

/**
 * THE ENGINE WORKER — where the thinking actually happens.
 *
 * **What is this?** A Web Worker. It receives a position, searches it on a background
 * thread, and posts back the move.
 *
 * **Why is it here?** Because a search is a tight loop that runs for seconds, and
 * JavaScript on a page has one thread. Run it on that thread and the board stops
 * redrawing, buttons stop responding, and the browser offers to kill the tab — while the
 * engine is working perfectly. Moving it off the main thread is the whole reason this file
 * exists, and it is the difference between an opponent and a freeze.
 *
 * **How does it work?** Two messages in, three out. A `search` runs to a depth ceiling or a
 * time budget, whichever binds first, reporting each completed iteration as `progress` so
 * the page can show the engine getting deeper. A `cancel` sets a flag the search polls
 * between nodes.
 *
 * **What is subtle? — this is the only place in the engine allowed to read a clock.**
 * Everything below `host/` is pure and deterministic: the same position, ruleset and depth
 * always produce the same move, which is what lets a self-play result be reproduced and a
 * bug be reduced to a single test case. Determinism is lost by accident, one `Date.now()`
 * at a time, so the time budget is injected *into* the search as a `shouldStop` callback
 * rather than read by it. `scripts/check-layer-boundaries.js` enforces that boundary.
 *
 * A consequence worth stating: because the clock lives here, a search bounded by *time*
 * is **not** deterministic across machines — a faster computer reaches a deeper iteration.
 * That is fine for play and unacceptable for the variant study, which must therefore bound
 * by depth alone. The two limits exist separately for exactly that reason.
 */

const worker = self as unknown as DedicatedWorkerGlobalScope

/** Ids the page has cancelled. Checked between nodes. */
const cancelled = new Set<number>()

function post(message: EngineResponse): void {
  worker.postMessage(message)
}

worker.onmessage = (event: MessageEvent<EngineRequest>) => {
  const request = event.data

  if (request.type === 'cancel') {
    cancelled.add(request.id)
    return
  }

  const startedAt = Date.now()
  const deadline = startedAt + request.budgetMs

  try {
    const result = search(request.state, {
      maxDepth: request.maxDepth,
      // The clock enters the search here and nowhere else.
      shouldStop: () => cancelled.has(request.id) || Date.now() > deadline,
      onIteration: iteration => post({
        type: 'progress',
        id: request.id,
        depth: iteration.depth,
        score: iteration.score,
        nodes: iteration.nodes,
      }),
    })

    post({
      type: 'result',
      id: request.id,
      move: result.move,
      score: result.score,
      depth: result.depth,
      nodes: result.nodes,
      quiescenceNodes: result.quiescenceNodes,
      elapsedMs: Date.now() - startedAt,
    })
  } catch (error) {
    // Report rather than swallow: a silent throw here leaves the page waiting forever for
    // a move, which looks like a hang and is a bug.
    post({
      type: 'error',
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    })
  } finally {
    cancelled.delete(request.id)
  }
}
