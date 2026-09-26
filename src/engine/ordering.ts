import type { Kind, Move, MovePosition } from '@game/types'
import { toIndex } from '@game/coord'
import { capturedSquare } from '@game/move'

/**
 * MOVE ORDERING — deciding which move to try first.
 *
 * **What is this?** A comparison function. Given the legal moves in a position, put the
 * ones most likely to be good at the front.
 *
 * **Why is it here? Because it is the cheapest large speedup an engine has.** Alpha-beta's
 * entire power comes from cutoffs, and a cutoff only happens once a move good enough to
 * refute the node has been *found*. Try the best move first and the rest are refuted
 * immediately: the search visits about `b^(d/2)` nodes. Try the worst first and nothing
 * gets refuted early: it visits all `b^d`, and the pruning bought nothing at all. Same
 * algorithm, same answer, quadratically different cost — decided entirely by the order of
 * a loop.
 *
 * **How does it work?** Three heuristics, cheapest first:
 *
 * 1. **The previous iteration's best move**, if we have one. Iterative deepening searches
 *    depth 1, then 2, then 3; the best move at depth `n-1` is very often still best at
 *    `n`. This is the strongest single hint available and it costs nothing to keep.
 * 2. **MVV-LVA** — *most valuable victim, least valuable attacker*. Taking a queen with a
 *    pawn is the best kind of capture: if it is a mistake you lose a pawn, and if it is
 *    not you win a queen. Rank captures by `victim × 10 − attacker`.
 * 3. **Promotions**, then everything else in generation order.
 *
 * **What is subtle?** *Ordering must never change the answer.* It reorders a loop whose
 * result is a maximum, so the score is invariant. `search.test.ts` enforces that by
 * running the equivalence check with ordering both on and off.
 *
 * The sort is **stable**, which matters more than it looks: equal-ranked moves keep
 * generation order, so the engine's choice between two equally good moves stays
 * deterministic and a self-play game stays reproducible.
 *
 * **What does the mirror seam change about this?**
 *
 * 1. **There are more captures to rank.** A piece can be taken by something on the far
 *    side of the board, so the capture list is longer and ordering matters *more* here
 *    than in chess, not less.
 * 2. **The victim of an en-passant capture is not on the destination square** — and
 *    across the seam it is not even on an adjacent file. Ordering therefore asks
 *    `capturedSquare()` rather than reading `board[to]`, which would silently rank every
 *    seam en passant as a quiet move.
 * 3. **The piece values below are known to be wrong for this variant** — a bishop that
 *    crosses the seam is worth more than chess says. That is *tolerable here and nowhere
 *    else*: MVV-LVA needs only an ordinal ranking, and a wrong ranking costs nodes, never
 *    correctness. The same values must **not** be fed to anything that prunes until they
 *    are measured (`prj-mgmt/epics/engine/engine-core.md`, "SEE: for ordering, never for
 *    pruning").
 */

/**
 * Ordinal piece ranks for MVV-LVA.
 *
 * **Provenance: placeholders, deliberately.** Only the *order* is used, never the
 * magnitude, so these can be wrong without being harmful — see the module note. The king
 * ranks highest as an attacker because capturing with the king is usually a last resort.
 */
const RANK: Readonly<Record<Kind, number>> = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 10 }

/** Score bands, so a capture can never sort below a quiet move whatever the ranks say. */
const PV_MOVE_BONUS = 1_000_000
const CAPTURE_BONUS = 10_000
const PROMOTION_BONUS = 1_000

/**
 * How promising a move looks, before searching it. Higher is tried first.
 *
 * @param position Board and rules. Never mutated.
 * @param move The move to rank.
 * @param preferred A move to put first — typically the previous iteration's best.
 */
export function orderingScore(position: MovePosition, move: Move, preferred: Move | null): number {
  if (preferred && isSameMove(move, preferred)) return PV_MOVE_BONUS

  let score = 0

  // `capturedSquare` rather than `board[to]`: an en-passant victim stands somewhere else
  // entirely, and across the seam it is seven files away.
  const victimSquare = capturedSquare(move)
  if (victimSquare) {
    const victim = position.board[toIndex(victimSquare)]
    const attacker = position.board[toIndex(move.from)]
    const victimRank = victim ? RANK[victim.kind] : RANK.P // en passant always takes a pawn
    const attackerRank = attacker ? RANK[attacker.kind] : 0
    score += CAPTURE_BONUS + victimRank * 10 - attackerRank
  }

  if (move.promotion) score += PROMOTION_BONUS + RANK[move.promotion]

  return score
}

/**
 * The moves, most promising first.
 *
 * Returns a new array; the input is not mutated. The sort is stable, so equally ranked
 * moves keep generation order and the engine stays deterministic.
 */
export function orderMoves(
  position: MovePosition,
  moves: readonly Move[],
  preferred: Move | null,
): Move[] {
  const scored = moves.map((move, index) => ({
    move,
    score: orderingScore(position, move, preferred),
    index,
  }))
  // Explicit index tie-break rather than relying on sort stability. Stability is
  // guaranteed by the spec, but the guarantee is worth not depending on for the one
  // property — determinism — that a self-play study cannot do without.
  scored.sort((a, b) => (b.score - a.score) || (a.index - b.index))
  return scored.map(entry => entry.move)
}

/** Do these describe the same move? Destination and promotion identify one (see `reducer.ts`). */
export function isSameMove(a: Move, b: Move): boolean {
  return a.from.f === b.from.f && a.from.r === b.from.r
    && a.to.f === b.to.f && a.to.r === b.to.r
    && a.promotion === b.promotion
}

/** Is this move worth looking at in a quiescence search — a capture or a promotion? */
export function isForcing(move: Move): boolean {
  return capturedSquare(move) !== null || move.promotion !== null
}
