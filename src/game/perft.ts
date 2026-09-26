import type { GameState, Move } from './types'
import { algebraic } from './coord'
import { advancePosition as advance } from './advance'
import { allLegalMoves } from './status'

/**
 * PERFT — counting leaf nodes to prove a move generator correct.
 *
 * **What is this?** *Perft* ("performance test") walks the game tree to a fixed depth
 * and counts the positions at the leaves. It is the standard correctness tool for
 * chess engines: a single number that changes if *any* rule is generated wrongly.
 *
 * **Why is it here?** Because it is an oracle we can check against something outside
 * this project. Move generation is easy to get subtly wrong — one missing edge case in
 * a thousand — and unit tests only cover the cases we thought of. Perft covers every
 * case reachable in N plies at once.
 *
 * **How does it work?** Generate the legal moves, apply each, recurse, and sum. At
 * `depth === 1` the answer is simply the number of legal moves, so the last ply costs
 * no board updates.
 *
 * **What is subtle?**
 *
 * 1. Perft counts *leaves*, not moves, and it is not a sum over depths. `perft(3)` is
 *    "positions after three plies", not "everything up to three plies".
 * 2. **The mirror seam gives us a free external oracle.** With every portal flag off,
 *    Mirror Chess *is* ordinary chess, whose perft numbers are published and verified
 *    by many independent engines. `src/game/perft.test.ts` checks against them — a
 *    correctness signal we cannot get for the variant, where nobody else has ever
 *    counted.
 * 3. When a count is wrong, {@link perftDivide} is the debugging tool: it breaks the
 *    total down by first move, so a mismatch can be bisected to the exact piece and
 *    square rather than stared at.
 */

/**
 * Count the positions reachable in exactly `depth` plies.
 *
 * @param state Position to start from. Never mutated.
 * @param depth Plies to search. `0` counts the position itself.
 * @returns The number of leaf positions.
 */
export function perft(state: GameState, depth: number): number {
  if (depth <= 0) return 1
  const moves = allLegalMoves(state, state.turn)
  if (depth === 1) return moves.length

  let nodes = 0
  for (const move of moves) nodes += perft(advance(state, move), depth - 1)
  return nodes
}

/**
 * Perft broken down by first move — the standard way to localise a wrong count.
 *
 * Compare against a known-good engine's divide output for the same position: the moves
 * whose subtotals differ tell you exactly where to look, and recursing into one of them
 * narrows it further.
 *
 * @returns Subtotals keyed by move, e.g. `"e2e4"`, or `"b3h4*"` for a portal move.
 */
export function perftDivide(state: GameState, depth: number): ReadonlyMap<string, number> {
  const out = new Map<string, number>()
  if (depth <= 0) return out
  for (const move of allLegalMoves(state, state.turn)) {
    out.set(moveKey(move), perft(advance(state, move), depth - 1))
  }
  return out
}

/**
 * A move as a short string: origin, destination, the promotion piece, and `*` when it
 * crosses the seam.
 *
 * Close enough to the long algebraic notation other engines' `divide` emits to be
 * compared against them by eye — which is the whole point of the function — while the `*`
 * marks the one thing no other engine has.
 */
export function moveKey(move: Move): string {
  const promotion = move.promotion ? move.promotion.toLowerCase() : ''
  return `${algebraic(move.from)}${algebraic(move.to)}${promotion}${move.crossedSeam ? '*' : ''}`
}
