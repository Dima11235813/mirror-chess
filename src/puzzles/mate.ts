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
 * Every first move that forces mate on the mover's next turn.
 *
 * @param state Position with the mating side to move. Never mutated.
 * @returns The forcing moves, in generation order. Empty when no mate in two exists;
 *   more than one entry means the position is **not** a usable puzzle.
 */
export function mateInTwoMoves(state: GameState): Move[] {
  const solutions: Move[] = []

  for (const first of allLegalMoves(state, state.turn)) {
    const afterFirst = play(state, first)
    if (!afterFirst) continue
    // Mate already: that is a mate in one, not this puzzle's goal.
    if (isCheckmate(afterFirst)) continue

    const replies = allLegalMoves(afterFirst, afterFirst.turn)
    // No reply and not mate means stalemate — a draw, so nothing is forced.
    if (replies.length === 0) continue

    let forcedEverywhere = true
    for (const reply of replies) {
      const afterReply = play(afterFirst, reply)
      // A reply the rules refuse is not an escape; it simply is not a move.
      if (!afterReply) continue
      if (!hasMateInOne(afterReply)) { forcedEverywhere = false; break }
    }
    if (forcedEverywhere) solutions.push(first)
  }

  return solutions
}

/**
 * Is this a mate in two with exactly one solution?
 *
 * @returns The unique forcing move, or `null` when there is none or more than one.
 */
export function uniqueMateInTwo(state: GameState): Move | null {
  const solutions = mateInTwoMoves(state)
  return solutions.length === 1 ? solutions[0]! : null
}
