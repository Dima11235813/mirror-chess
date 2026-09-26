import type { Color, GameState, Move, MovePosition } from './types'
import { isInCheck } from './attacks'
import { legalMovesFor } from './moves'
import { drawnBy, type DrawStatus } from './draw-rules'

/**
 * GAME STATUS — `prj-mgmt/epics/rules/mirror-portal-spec.md` §10.4, extended by
 * `prj-mgmt/epics/rules/draw-rules.md`.
 *
 * **What is this?** The one place that answers "how does this game stand?" — playing,
 * check, or one of the ways it has ended.
 *
 * **How does it work?** Checkmate and stalemate both mean "no legal move"; the only
 * difference is whether the side to move is in check. Neither is a rule about mirroring —
 * both fall out of §10.3 legality filtering, which already accounts for portal attacks.
 * The three draws come from `draw-rules.ts` and need the game history that a bare
 * position does not carry.
 *
 * **What is subtle?** *Order.* Checkmate is decided **first**, because a mate delivered
 * on the hundredth halfmove is a mate, not a fifty-move draw — the game ended before the
 * clock could be claimed. Everything else is a draw, so their relative order changes only
 * which reason is reported, and the most informative reason wins.
 *
 * **What does the mirror seam change about it?** It makes the draws matter more. With
 * kings able to wrap the seam they are far harder to corner
 * (`prj-mgmt/epics/rules/stepper-portal.md` dissolved three of our mating positions), so
 * positions that would be mate in chess are here just shuffling — and shuffling is
 * exactly what these rules terminate.
 */

/**
 * Terminal and non-terminal states of a position.
 *
 * `'move-limit'` is deliberately **not** a draw. It is the backstop for automated play,
 * kept as its own outcome so a study can never silently count "we gave up" as a result
 * the rules produced.
 */
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | DrawStatus | 'move-limit'

/** Statuses in which no further move may be played. */
const TERMINAL_STATUSES: readonly GameStatus[] = [
  'checkmate',
  'stalemate',
  'draw-repetition',
  'draw-fifty-move',
  'draw-insufficient-material',
  'move-limit',
]

/** Statuses that are a draw under the rules of the game — `'move-limit'` is not one. */
const DRAWN_STATUSES: readonly GameStatus[] = [
  'stalemate',
  'draw-repetition',
  'draw-fifty-move',
  'draw-insufficient-material',
]

/** How the game is adjudicated beyond the rules themselves. */
export interface StatusOptions {
  /**
   * Halfmoves after which the game is abandoned as `'move-limit'`.
   *
   * Omitted means no limit, which is what a human game wants — a person can simply stop
   * playing. Self-play must always pass one: it is the only guarantee that a search bug
   * producing an endless shuffle fails loudly instead of hanging the study.
   */
  readonly maxPlies?: number
}

/**
 * Every legal move available to `color` in `state`.
 *
 * @param state Board and rules only — draw state is deliberately out of reach here, so
 *   that neither this function nor perft can adjudicate. Never mutated.
 * @param color Side to generate for.
 * @returns All legal moves, in board order by origin square.
 */
export function allLegalMoves(state: MovePosition, color: Color): Move[] {
  const out: Move[] = []
  for (let i = 0; i < 64; i++) {
    const piece = state.board[i]
    if (!piece || piece.color !== color) continue
    for (const m of legalMovesFor(state, { f: i % 8, r: Math.floor(i / 8) })) out.push(m)
  }
  return out
}

/**
 * Classify the position from the perspective of the side to move.
 *
 * @param state Game to read — position *and* history, since three of the outcomes are
 *   not decidable from the board alone. Never mutated.
 * @param options Adjudication beyond the rules; see {@link StatusOptions}.
 * @returns `'checkmate'` / `'stalemate'` when the side to move has no legal move, then
 *   any draw the history establishes, then `'move-limit'` if one was set and reached,
 *   `'check'` when in check but still playable, otherwise `'playing'`.
 */
export function gameStatus(state: GameState, options: StatusOptions = {}): GameStatus {
  const inCheck = isInCheck(state, state.turn)

  // Mate and stalemate first: a game that has ended by the board cannot also end by the
  // clock, and a mate on the fiftieth move is a mate.
  if (allLegalMoves(state, state.turn).length === 0) return inCheck ? 'checkmate' : 'stalemate'

  const draw = drawnBy(state)
  if (draw) return draw

  if (options.maxPlies !== undefined && state.plies >= options.maxPlies) return 'move-limit'

  return inCheck ? 'check' : 'playing'
}

/** True when the game has ended and no further move may be played. */
export function isGameOver(status: GameStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

/**
 * True when the game ended in a draw.
 *
 * `'move-limit'` returns `false`: abandoning a game is not one of its results, and a
 * study that counted it as a draw would report a balance that the rules never produced.
 */
export function isDraw(status: GameStatus): boolean {
  return DRAWN_STATUSES.includes(status)
}
