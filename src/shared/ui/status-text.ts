import type { GameStatus } from '@game/status'
import type { Color } from '@game/types'

/** Human-readable descriptions of a position's status, for the game footer. */

/**
 * Describe the position for the player.
 *
 * Each draw names its own reason rather than collapsing to "draw". A player who has just
 * had a game ended under them is owed the reason, and the three are easy to confuse —
 * especially here, where the seam makes shuffling common enough that repetition and the
 * fifty-move clock both fire often.
 *
 * @param status Classification of the position (see `gameStatus`).
 * @param turn Side to move. On checkmate this is the side that has been mated, so
 *   the winner is its opponent.
 * @returns A single sentence fragment. Never empty, so the live region always has
 *   something to announce.
 */
export function describeStatus(status: GameStatus, turn: Color): string {
  switch (status) {
    case 'checkmate':
      return `Checkmate — ${opponentOf(turn)} wins`
    case 'stalemate':
      return 'Stalemate — draw'
    case 'draw-repetition':
      return 'Draw — threefold repetition'
    case 'draw-fifty-move':
      return 'Draw — fifty-move rule'
    case 'draw-insufficient-material':
      return 'Draw — insufficient material'
    case 'move-limit':
      // Not a draw and deliberately not worded as one: the game was abandoned, and no
      // result the rules produce should be confused with giving up.
      return 'Move limit reached — no result'
    case 'check':
      return `Turn: ${turn} — check`
    case 'playing':
      return `Turn: ${turn}`
  }
}

function opponentOf(color: Color): Color {
  return color === 'white' ? 'black' : 'white'
}
