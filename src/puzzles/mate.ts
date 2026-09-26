/**
 * THE MATE SOLVER — exact, exhaustive, and deliberately stupid.
 *
 * **What is this?** A brute-force answer to "which first moves force mate in two?", built
 * on nothing but the rules layer: `allLegalMoves`, `reduceMove` and `gameStatus`.
 *
 * **Why is it here?** A puzzle is a claim a player will be scored against, so it must be
 * *proved*, not believed. The engine could find these mates faster, but then every puzzle
 * would inherit every engine bug, and a wrong puzzle is indistinguishable from a hard one.
 * `src/game/*` is the perft-verified oracle (ADR 0002), so a puzzle proved here is exactly
 * as trustworthy as the published perft counts — and nothing in `src/engine/*` can make it
 * wrong. This module is also how the engine's search gets checked on mate suites: two
 * implementations, one oracle, applied to puzzles.
 *
 * **How does it work?** The definition, written out:
 *
 * - *mate in one* — a move after which the opponent is checkmated.
 * - *mate in two* — a move after which **every** opponent reply allows a mate in one.
 *
 * Search all first moves rather than stopping at the first success, because the puzzle
 * needs to know whether the answer is **unique**. A position with two solutions is
 * unusable: the UI would reject a correct answer.
 *
 * **What is subtle?** The opponent having *no* reply after the first move is not a mate in
 * two — it is either mate already (so mate in one, a different puzzle) or stalemate (a
 * draw, and no puzzle at all). Both are rejected here rather than counted, because
 * "forced" has to mean the opponent moved and still lost.
 *
 * **What does the mirror seam change about this?** Nothing in the logic, and a great deal
 * in the answers. Mates are *rarer* here — a king cannot be cornered against the edge
 * file, since the file wraps — and the ones that exist are often impossible in chess: a
 * lone bishop mates when it can capture across the seam. Measured 2026-09-25: only ~2% of
 * game-like positions hold any forced mate, while in sparse endgames nearly every mate
 * found is one chess cannot produce.
 */
import { allLegalMoves, gameStatus } from '../game/status'
import { reduceMove } from '../game/reducer'
import type { GameState, Move } from '../game/types'

/** Is the side to move checkmated right now? */
function isCheckmate(state: GameState): boolean {
  return gameStatus(state) === 'checkmate'
}

/**
 * Apply a move for the side to move, or return `null` if the rules refuse it.
 *
 * `reduceMove` returns the *same state* it was given when a move is illegal or the game is
 * already drawn, which is a silent no-op if nobody checks — and a silent no-op here would
 * turn into a puzzle whose solution cannot be played.
 */
function play(state: GameState, move: Move): GameState | null {
  const next = reduceMove(state, move)
  return next === state ? null : next
}

/** Does the side to move have a move that mates immediately? */
export function hasMateInOne(state: GameState): boolean {
  for (const move of allLegalMoves(state, state.turn)) {
    const after = play(state, move)
    if (after && isCheckmate(after)) return true
  }
  return false
}

/**
 * Every first move that forces mate in exactly `moves` of the mover's turns.
 *
 * The definition, written out recursively:
 *
 * - **mate in 1** — a move after which the opponent is checkmated.
 * - **mate in n** — a move after which **every** opponent reply allows a mate in `n−1`.
 *
 * All first moves are searched rather than stopping at the first success, because a puzzle
 * needs to know whether the answer is **unique**.
 *
 * **Cost grows sharply.** Each extra move multiplies by roughly (our moves × their
 * replies), and the expensive case is the common one: proving *no* mate exists requires the
 * full enumeration, so early exit does not save the average. Mate in 3 is ~100× mate in 2
 * on the same position, which is why the miner pre-filters with the engine before calling
 * this to prove a candidate.
 *
 * @param state Position with the mating side to move. Never mutated.
 * @param moves How many of the mover's turns the mate must take. 1, 2 or 3.
 * @returns The forcing moves, in generation order. More than one entry means the position
 *   is **not** a usable puzzle; the caller must also reject a faster mate — see
 *   {@link fastestMateIn}.
 */
export function forcedMateMoves(state: GameState, moves: number): Move[] {
  if (moves < 1) return []

  const solutions: Move[] = []
  for (const first of allLegalMoves(state, state.turn)) {
    const afterFirst = play(state, first)
    if (!afterFirst) continue

    if (moves === 1) {
      if (isCheckmate(afterFirst)) solutions.push(first)
      continue
    }

    // Mate already: that is a shorter mate, not this goal.
    if (isCheckmate(afterFirst)) continue

    const replies = allLegalMoves(afterFirst, afterFirst.turn)
    // No reply and not mate means stalemate — a draw, so nothing is forced.
    if (replies.length === 0) continue

    let forcedEverywhere = true
    for (const reply of replies) {
      const afterReply = play(afterFirst, reply)
      // A reply the rules refuse is not an escape; it simply is not a move.
      if (!afterReply) continue
      if (forcedMateMoves(afterReply, moves - 1).length === 0) { forcedEverywhere = false; break }
    }
    if (forcedEverywhere) solutions.push(first)
  }
  return solutions
}

/** Every first move that forces mate on the mover's next turn. */
export function mateInTwoMoves(state: GameState): Move[] {
  return forcedMateMoves(state, 2)
}

/** Every first move that forces mate within three of the mover's turns. */
export function mateInThreeMoves(state: GameState): Move[] {
  return forcedMateMoves(state, 3)
}

/**
 * The shortest forced mate available, if any, up to `limit` moves.
 *
 * A puzzle must not offer a faster mate than the one it asks for: then its "only answer"
 * is not the best answer, and a player who mates sooner is told they are wrong. This is
 * how the miner checks that, and it cost a broken fixture to learn.
 *
 * @returns The number of moves in the fastest mate, or `null` if there is none.
 */
export function fastestMateIn(state: GameState, limit: number): number | null {
  for (let n = 1; n <= limit; n++) {
    if (forcedMateMoves(state, n).length > 0) return n
  }
  return null
}

/**
 * Is this a forced mate in `moves` with exactly one solution?
 *
 * @returns The unique forcing move, or `null` when there is none or more than one.
 */
export function uniqueForcedMate(state: GameState, moves: number): Move | null {
  const solutions = forcedMateMoves(state, moves)
  return solutions.length === 1 ? solutions[0]! : null
}

/** Is this a mate in two with exactly one solution? */
export function uniqueMateInTwo(state: GameState): Move | null {
  return uniqueForcedMate(state, 2)
}
