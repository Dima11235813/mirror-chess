import type { GameState } from '@game/types'
import { allLegalMoves } from '@game/status'
import { advancePosition } from '@game/advance'
import { evaluate } from './eval'
import { cp, type Centipawns } from './types'

/**
 * ENGINE DIAGNOSTICS — numbers that explain a move rather than make one.
 *
 * **What is this?** One measurement: of the moves legal in a position, how many does the
 * **evaluation** fail to tell apart?
 *
 * **Why is it here?** Because this engine's blocker is that it cannot tell quiet moves
 * apart, and that was a sentence in a document rather than something anyone could see. A
 * self-play game opens `b1c3 a7a6 a1b1 a6a5 b1a1 a5a4` — a rook shuffling — identically
 * under every one of the 64 rulesets, because a material-only evaluation scores every
 * quiet move zero. This turns that into a gauge:
 * `prj-mgmt/epics/balance/watch-a-game.md`.
 *
 * **How does it work?** Play each legal move, evaluate the position it leads to from the
 * mover's point of view, and count how many share the best score. Nothing clever, and
 * deliberately so: it is a diagnostic, it runs once per displayed position, and it must be
 * obviously correct rather than fast.
 *
 * **What is subtle — and the reason this is not taken from the search.** The search can
 * separate moves the evaluation cannot: alpha-beta finds a tactic three plies away and
 * prefers the move that wins material, even when every root move evaluates to zero
 * *statically*. A count taken from search scores would therefore hide exactly the problem
 * this number exists to expose, and would also be a count of **bounds** rather than values,
 * since every root move after the first is searched with a narrowed window.
 *
 * **What does the mirror seam change about this?** Nothing in the arithmetic, and that is
 * worth stating: the count is over `allLegalMoves`, so a ruleset where pieces cross simply
 * has more moves to be indifferent between. It does mean the number is **per ruleset** and
 * not comparable across them without saying which.
 */

/** What the evaluation can and cannot distinguish in one position. */
export interface RootDiagnostics {
  /** Legal moves available to the side to move. `0` when the game is over. */
  readonly legalMoves: number
  /**
   * How many of those share the **best static evaluation** — including the best move
   * itself, so `1` means "one clearly best move" and `legalMoves` means "no preference at
   * all". `0` only when there are no legal moves.
   */
  readonly indistinguishable: number
  /** The best static score, from the moving side's point of view. */
  readonly bestStatic: Centipawns
}

/**
 * Measure what the evaluation can distinguish among a position's legal moves.
 *
 * @param state Position to inspect, including whose turn it is and the ruleset. Never
 *   mutated.
 * @returns The counts above. Costs one evaluation per legal move — tens of microseconds,
 *   paid once per position shown, never inside a search.
 */
export function rootDiagnostics(state: GameState): RootDiagnostics {
  const moves = allLegalMoves(state, state.turn)
  if (moves.length === 0) {
    return { legalMoves: 0, indistinguishable: 0, bestStatic: cp(0) }
  }

  const mover = state.turn
  let best = -Infinity
  let ties = 0

  for (const move of moves) {
    const score = evaluate(advancePosition(state, move), mover)
    if (score > best) {
      best = score
      ties = 1
    } else if (score === best) {
      ties++
    }
  }

  return { legalMoves: moves.length, indistinguishable: ties, bestStatic: cp(best) }
}
