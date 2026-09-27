import { useEffect, useMemo, useRef, useState } from 'react'
import type { Color, GameState, Move } from '@game/types'
import { isGameOver, type GameStatus } from '@game/status'
import { EngineClient } from '@engine/host/engine-client'
import { difficultyById, type DifficultyId } from '@engine/host/levels'

/**
 * Wiring the engine to the board.
 *
 * **What is this?** A hook that watches whose turn it is and, when it is the engine's,
 * asks for a move and plays it.
 *
 * **Why is it here rather than in `App.tsx`?** Because the tricky part is not asking for a
 * move — it is making sure a move that arrives late is *not* played. The engine thinks for
 * up to several seconds, during which the player can reset, load a saved game or switch
 * sides. Every one of those makes the answer worthless, and playing it anyway would apply
 * a move to a board it was never computed for.
 *
 * **How does it work?** Two guards, belt and braces:
 *
 * 1. `EngineClient` drops any reply whose request id is not the current one.
 * 2. This hook re-checks, at the moment the move comes back, that the position it was
 *    asked about is still the position on screen. React state can have moved on even when
 *    the id matches — a saved game can be loaded that happens to be the engine's turn.
 *
 * **What is subtle?** The effect keys on the *identity* of `state`. The game core is
 * immutable, so every accepted move produces a new object and identity is a sound proxy
 * for "something happened" — no deep comparison, and no chance of missing a change.
 */

export interface EngineOpponentOptions {
  readonly state: GameState
  readonly status: GameStatus
  /** Which colour the engine plays, or `null` for two humans. */
  readonly engineSide: Color | null
  readonly difficulty: DifficultyId
  /** Apply a move. Should go through `reduceMove`, so an engine bug cannot corrupt state. */
  readonly onMove: (move: Move) => void
}

/** What the UI needs to show about the engine. */
export interface EngineOpponentState {
  readonly thinking: boolean
  /** Deepest completed iteration so far, for a "thinking… depth 4" display. */
  readonly reachedDepth: number | null
  /** Set when the worker failed, so the page can say so instead of hanging silently. */
  readonly error: string | null
}

export function useEngineOpponent(options: EngineOpponentOptions): EngineOpponentState {
  const { state, status, engineSide, difficulty, onMove } = options

  const clientRef = useRef<EngineClient | null>(null)
  const [thinking, setThinking] = useState(false)
  const [reachedDepth, setReachedDepth] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Keep the latest `onMove` reachable without making it an effect dependency: it is
  // recreated every render, and depending on it would restart the search continuously.
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  const client = useMemo(() => {
    if (!clientRef.current) clientRef.current = new EngineClient()
    return clientRef.current
  }, [])

  useEffect(() => () => client.dispose(), [client])

  const engineToMove = engineSide !== null && state.turn === engineSide && !isGameOver(status)

  useEffect(() => {
    if (!engineToMove) {
      client.cancel()
      setThinking(false)
      return
    }

    let abandoned = false
    const askedAbout = state

    setThinking(true)
    setReachedDepth(null)
    setError(null)

    client
      .think(askedAbout, difficultyById(difficulty), {
        onProgress: progress => { if (!abandoned) setReachedDepth(progress.depth) },
      })
      .then(result => {
        // Second guard: the board may have moved on even though the id still matched.
        if (abandoned || !result?.move) return
        onMoveRef.current(result.move)
      })
      .catch(reason => {
        if (!abandoned) setError(reason instanceof Error ? reason.message : String(reason))
      })
      .finally(() => { if (!abandoned) setThinking(false) })

    return () => {
      abandoned = true
      client.cancel()
    }
  }, [client, engineToMove, state, difficulty])

  return { thinking, reachedDepth, error }
}
