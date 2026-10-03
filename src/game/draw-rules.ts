import type { Board, Color, GameState, Position } from './types'


/**
 * DRAW RULES — `prj-mgmt/epics/rules/draw-rules.md`.
 *
 * **What is this?** The three ways a chess game ends without either side winning and
 * without stalemate: the same position occurring three times, fifty moves with nothing
 * irreversible happening, and neither side owning enough material to mate.
 *
 * **Why is it here?** Because until it was, this game had no guarantee of ending.
 * Checkmate and stalemate were the only terminal states, so two engines with no progress
 * to make would shuffle forever — and every part of the variant study
 * (`prj-mgmt/epics/balance/`) depends on games finishing.
 *
 * **How does it work?** Repetition and the fifty-move rule are *counting* rules: they
 * read the history `GameState` carries and decide nothing about the board. Insufficient
 * material is the opposite — a pure function of the position, with no history at all.
 * That is why the first two take a `GameState` and the third takes a {@link Position}.
 *
 * **What does the mirror seam change about it?**
 *
 * 1. **It makes these rules matter more, not less.** Kings wrap the seam (spec §11), so
 *    cornering one is much harder and positions that would be mate in chess are here just
 *    shuffling. Expect draws to carry a larger share of results than in chess.
 * 2. **It changes nothing about insufficient material** — which is itself the finding,
 *    and it was not free. Until 2026-10-03 this file said the opposite, in detail: a
 *    bishop able to capture across the seam mated a lone king by itself
 *    (`Ka1, Bd4` vs `Kh8`), because its second diagonal re-entered through the seam and
 *    covered the flight squares. That was **true, enumerated, and tested** under the
 *    crossing of the time, which preserved rank and so flipped the bishop's square
 *    colour. The revised crossing continues the diagonal (spec §4) and therefore
 *    preserves colour, so a dark bishop cannot touch `g8` or `h7` and the king walks out.
 *    Re-enumerated over every placement and all 16 bishop/king flag settings:
 *    **no mate exists**. The table below is chess's, exactly.
 *
 *    The lesson is not "we were wrong"; it is that this rule is only ever as good as the
 *    geometry underneath it, so it is *derived by enumeration* and never reasoned about.
 *    When the geometry moved, the enumeration moved with it in one run.
 *
 * 3. **A bishop stays colour-bound.** A crossing changes the file by `±7` and the rank by
 *    `±1`, and `±7` has the same parity as `±1`, so `(f + r) % 2` is preserved (spec §7).
 *    "King and bishop versus king and bishop on the same colour" is therefore a closed
 *    material class, as in chess, and the enumeration finds no mate in it.
 *
 * **So this file reads no rule flags at all.** It used to take a `Position` for its rules
 * as well as its board; it still does, because the signature is part of the API and
 * because a future rule may need them — but today insufficient material is the one place
 * where the seam turned out to change *nothing*, and that is worth saying out loud rather
 * than leaving as an absence.
 *
 * **What is deliberately conservative?** Where the enumeration in `draw-rules.test.ts`
 * does not settle a case, it is resolved as "keep playing". Declaring a draw the rules do
 * not require ends a game someone could still have won; failing to declare one merely
 * costs some moves.
 */

/** The ways a game can be drawn. Stalemate is the fourth, and lives in `status.ts`. */
export type DrawStatus = 'draw-repetition' | 'draw-fifty-move' | 'draw-insufficient-material'

/**
 * Occurrences of one position that make a draw.
 *
 * Three, per FIDE 9.2. We apply it **automatically** rather than on a claim: there is no
 * claim UI, and self-play needs the result to be deterministic rather than dependent on
 * an engine remembering to ask.
 */
export const REPETITION_LIMIT = 3

/**
 * Halfmoves without a capture or a pawn move that make a draw.
 *
 * A hundred, not fifty — the rule counts fifty moves **by each side**, which is the part
 * everybody misreads.
 */
export const FIFTY_MOVE_HALFMOVES = 100

/**
 * How many times the current position has occurred in this game.
 *
 * Reads `history`, whose last entry is by construction the current position, so this is
 * always at least `1`.
 *
 * @param state Game to read. Never mutated.
 */
export function repetitionCount(state: GameState): number {
  const current = state.history[state.history.length - 1]
  if (current === undefined) return 0
  let count = 0
  for (const key of state.history) if (key === current) count++
  return count
}

/**
 * Has the current position occurred {@link REPETITION_LIMIT} times?
 *
 * @param state Game to read. Never mutated.
 */
export function isThreefoldRepetition(state: GameState): boolean {
  return repetitionCount(state) >= REPETITION_LIMIT
}

/**
 * Have {@link FIFTY_MOVE_HALFMOVES} halfmoves passed with no capture and no pawn move?
 *
 * @param state Game to read. Never mutated.
 */
export function isFiftyMoveRule(state: GameState): boolean {
  return state.halfmoveClock >= FIFTY_MOVE_HALFMOVES
}

/** One side's material, reduced to the only distinctions the rule cares about. */
interface SideMaterial {
  /**
   * Pawns, rooks and queens together. Any one of them means mate is possible, so the rule
   * never needs to tell them apart. A pawn counts because a pawn is a future queen.
   */
  readonly mating: number
  readonly knights: number
  /** The square colour — `(f + r) % 2` — of each bishop, which is what the rule turns on. */
  readonly bishopSquareColors: readonly number[]
  readonly kings: number
}

/** Reduce one side's pieces to a {@link SideMaterial}. */
function censusOf(board: Board, color: Color): SideMaterial {
  let mating = 0
  let knights = 0
  let kings = 0
  const bishopSquareColors: number[] = []
  for (let i = 0; i < 64; i++) {
    const piece = board[i]
    if (!piece || piece.color !== color) continue
    switch (piece.kind) {
      case 'P': case 'R': case 'Q': mating++; break
      case 'N': knights++; break
      case 'B': bishopSquareColors.push(((i % 8) + Math.floor(i / 8)) % 2); break
      case 'K': kings++; break
    }
  }
  return { mating, knights, bishopSquareColors, kings }
}

/** Minor pieces — the only ones left once {@link SideMaterial.mating} is zero. */
function minorCount(side: SideMaterial): number {
  return side.knights + side.bishopSquareColors.length
}

/**
 * Can neither side possibly deliver checkmate?
 *
 * This is FIDE's *dead position* test, not "cannot force a win": the question is whether
 * a checkmate with this material is **reachable at all**. That framing is what makes the
 * rule provable rather than a matter of endgame judgement, and `draw-rules.test.ts`
 * settles every row below by enumerating *every placement* of that material under *every*
 * setting of the flags that could affect it, and finding no mate.
 *
 * The rows are symmetric between the sides — which side owns the piece never matters,
 * since nothing here has a direction the way a pawn does.
 *
 * | Material | Drawn when | Same as chess? |
 * | --- | --- | --- |
 * | K vs K | always | yes |
 * | K+N vs K | always — even a knight that wraps the seam cannot mate | yes |
 * | K+B vs K | always — **re-enumerated 2026-10-03**, was `!portalCaptures(B)` | yes, again |
 * | K+B vs K+B, bishops on the same square colour | always — **re-enumerated 2026-10-03**, was `!portalEnabled(B)` | yes, again |
 * | anything else | never | yes |
 *
 * **Why the two bishop rows lost their gates** (2026-10-03). Both gates existed because a
 * crossing used to flip the bishop's square colour: a bishop could reach all 64 squares,
 * so it could mate alone, and two same-coloured bishops could become opposite-coloured.
 * The revised crossing preserves colour (spec §7), so both effects vanish, and both rows
 * are now unconditional. This was settled by re-running the enumerations — **all 16
 * bishop/king flag combinations, every placement, no mate in any of them** — not by
 * reasoning from the parity argument, even though the parity argument predicted it.
 * The reasoning is what justified *looking*; the enumeration is what settled it.
 *
 * @param position Board **and rules**. The same pieces are dead under one ruleset and
 *   playable under another, so a board alone cannot answer this. Never mutated.
 */
export function isInsufficientMaterial(position: Position): boolean {
  const white = censusOf(position.board, 'white')
  const black = censusOf(position.board, 'black')

  // Both kings must be present. Not a technicality: this engine deliberately supports
  // partial positions with no king, so that a rule can be inspected in isolation (spec
  // §10.2, and `legalMovesFor` filters nothing without one). Adjudicating those would
  // declare "a lone knight on a3" a drawn game and silently blank the board.
  if (white.kings !== 1 || black.kings !== 1) return false

  if (white.mating > 0 || black.mating > 0) return false

  const knights = white.knights + black.knights
  const minors = minorCount(white) + minorCount(black)

  if (minors === 0) return true // K vs K
  // K + one minor vs K: no mate exists, under any of the 64 rulesets. Enumerated, not
  // inherited — see the table above and `draw-rules.test.ts`.
  if (minors === 1) return true
  if (minors > 2) return false

  const oneBishopEach = knights === 0
    && white.bishopSquareColors.length === 1 && black.bishopSquareColors.length === 1
  if (!oneBishopEach) return false // K+2 minors vs K: mates exist, so play on

  // Same-colour bishops: a closed class again, because a crossing preserves square
  // colour (spec §7). Opposite colours can mate, as in chess.
  return white.bishopSquareColors[0] === black.bishopSquareColors[0]
}

/**
 * The draw this game has reached, if any.
 *
 * Checked **before** the move generator runs, so this is also the cheap guard the reducer
 * uses to stop a drawn game accepting more moves — none of the three needs a legal-move
 * list. Callers wanting the full picture, including checkmate and stalemate, want
 * `gameStatus` instead.
 *
 * @param state Game to read. Never mutated.
 * @returns The reason, or `null` if the game is not drawn by any of these rules. When
 *   more than one applies the order below decides which is *reported*; the outcome is a
 *   draw either way.
 */
export function drawnBy(state: GameState): DrawStatus | null {
  // Material first: it is a permanent property of the position rather than an event, so
  // it is the most informative thing to tell a player.
  if (isInsufficientMaterial(state)) return 'draw-insufficient-material'
  if (isThreefoldRepetition(state)) return 'draw-repetition'
  if (isFiftyMoveRule(state)) return 'draw-fifty-move'
  return null
}
