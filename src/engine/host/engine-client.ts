import type { GameState, Move } from '@game/types'
import type { Difficulty } from './levels'
import type { EngineRequest, EngineResponse, ProgressMessage, ResultMessage } from './protocol'

/**
 * THE ENGINE CLIENT — the page's half of the worker conversation.
 *
 * **What is this?** A small object that owns the worker, hands out search requests, and
 * guarantees that a reply from a search you no longer care about can never reach you.
 *
 * **Why is it here?** Because `postMessage` is fire-and-forget, and the interesting bugs in
 * this shape of code are all about *timing*: the user resets the board while the engine is
 * thinking, or takes back a move, or switches sides, and two seconds later a move arrives
 * for a position that no longer exists. Applying it corrupts the game. The fix is to make
 * every request cancellable and every reply id-checked, in one place, so no caller has to
 * remember.
 *
 * **How does it work?** Each `think()` takes the next id, tells the worker to abandon
 * anything earlier, and resolves only for its own id. `cancel()` abandons the current
 * search without waiting for it.
 *
 * **What is subtle?** The worker is created **lazily**, on the first search. A page where
 * the player never chooses an engine opponent never spawns a thread — and, more usefully,
 * an environment without workers at all (a unit test, a server render) never touches one.
 */

/** Progress and result callbacks for one search. */
export interface ThinkHandlers {
  readonly onProgress?: (progress: ProgressMessage) => void
}

/**
 * Owns one worker and the id bookkeeping around it.
 *
 * Create one per page, not one per move: spawning a worker costs tens of milliseconds and
 * the thread is stateless between searches.
 */
export class EngineClient {
  private worker: Worker | null = null
  private nextId = 1
  private activeId: number | null = null

  /** Build the worker on first use. Vite resolves the URL form at build time. */
  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    }
    return this.worker
  }

  /**
   * Ask for a move.
   *
   * @param state Position to search. Passed to the worker by structured clone; the game
   *   core is plain data, so no serialisation step is needed.
   * @param difficulty Depth ceiling and time budget.
   * @param handlers Optional per-iteration progress, for a "thinking" display.
   * @returns The chosen move, or `null` if the search was superseded or cancelled —
   *   which the caller should treat as "do nothing", never as "no legal move".
   */
  think(state: GameState, difficulty: Difficulty, handlers: ThinkHandlers = {}): Promise<ResultMessage | null> {
    const worker = this.ensureWorker()
    this.cancel()

    const id = this.nextId++
    this.activeId = id

    return new Promise<ResultMessage | null>((resolve, reject) => {
      const listener = (event: MessageEvent<EngineResponse>) => {
        const message = event.data
        // The whole point of the id: a reply from a superseded search is dropped here and
        // can never reach a board it does not belong to.
        if (message.id !== id) return

        if (message.type === 'progress') {
          handlers.onProgress?.(message)
          return
        }

        worker.removeEventListener('message', listener)
        if (this.activeId === id) this.activeId = null

        if (message.type === 'error') reject(new Error(message.message))
        else resolve(message)
      }

      worker.addEventListener('message', listener)
      const request: EngineRequest = {
        type: 'search',
        id,
        state,
        maxDepth: difficulty.maxDepth,
        budgetMs: difficulty.budgetMs,
      }
      worker.postMessage(request)
    })
  }

  /**
   * Abandon the search in flight, if any.
   *
   * The worker still finishes and replies — a search cannot be interrupted mid-node from
   * outside — but the reply is ignored by the id check above. Cheap, and safe to call when
   * nothing is running.
   */
  cancel(): void {
    if (this.activeId === null || !this.worker) return
    const request: EngineRequest = { type: 'cancel', id: this.activeId }
    this.worker.postMessage(request)
    this.activeId = null
  }

  /** Is a search currently in flight? */
  get thinking(): boolean {
    return this.activeId !== null
  }

  /** Tear the worker down. Call when the page is done with it. */
  dispose(): void {
    this.cancel()
    this.worker?.terminate()
    this.worker = null
  }
}

/** A move chosen by the engine, with the reasoning a UI might display. */
export interface EngineMove {
  readonly move: Move
  readonly depth: number
  readonly score: number
  readonly nodes: number
  readonly elapsedMs: number
}
