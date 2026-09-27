import type { Board, Color, GameState, Position } from './types'
import { portalCaptures, portalEnabled } from './rules'

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
 * 2. **A bishop that can capture across the seam mates a lone king by itself.** This is
 *    the finding that overturned this story's original acceptance criteria, which
 *    inherited from chess the idea that a lone minor piece can never mate. It can:
 *
 *    ```
 *    White Ka1, Bd4 — Black Kh8, Black to move: checkmate.
 *    ```
 *
 *    The bishop checks along the ordinary `d4–h8` diagonal. Its *other* diagonal runs
 *    `c5, b6, a7`, steps through the seam onto `h7`, and continues to `g8` — covering
 *    both squares the king would flee to. No second attacker is involved; king and
 *    bishop is mating material here in a way it has never been in chess.
 *
 * 3. **It breaks the bishop's colour-boundedness.** A portal hop preserves rank and swaps
 *    file `f` for `7 - f`; since `0` and `7` differ in parity, `(f + r) % 2` flips. So a
 *    bishop that crosses the seam *changes square colour*. "King and bishop versus king
 *    and bishop on the same colour" — a draw in chess precisely because the two bishops
 *    can never meet — stops being a stable description of the material at all.
 *
 * The two facts carry **different gates**, and the difference is the subtlety of this
 * file. Mating needs the bishop to give *check* through the seam, and attack follows
 * capture (spec §12.2), so the lone-bishop case turns on `portalCaptures`. Changing
 * square colour needs only to *arrive* on the far side, by either right, so the
 * two-bishop case turns on `portalEnabled`.
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
 * | Material | Drawn when |
 * | --- | --- |
 * | K vs K | always |
 * | K+N vs K | always — even a knight that wraps the seam cannot mate |
 * | K+B vs K | `!portalCaptures(B)` |
 * | K+B vs K+B, bishops on the same square colour | `!portalEnabled(B)` |
 * | anything else | never |
 *
 * **Why the two bishop rows have different gates** — the one thing to understand here:
 *
 * - Row three asks *can this bishop mate?* Mate needs check, and check through the seam
 *   needs the capture right (spec §12.2, attack follows capture). A bishop with only the
 *   quiet right crosses the seam but cannot attack across it, and the enumeration finds
 *   no mate for it. So the gate is `portalCaptures`.
 * - Row four asks *is "same colour" still a property of the game?* A bishop changes
 *   square colour merely by *arriving* on the far side, which either right permits. Once
 *   it can, the material is no longer a closed class — the bishops can become
 *   opposite-coloured, and opposite-coloured bishops mate even in chess. So the gate is
 *   the wider `portalEnabled`, and it is not conservatism: measuring row four the way row
 *   three is measured would be measuring the wrong question.
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
  if (minors === 1) {
    // K + one minor vs K. A lone knight never mates; a lone bishop does once it can
    // check through the seam.
    return knights === 1 || !portalCaptures(position.rules, 'B')
  }
  if (minors > 2) return false

  const oneBishopEach = knights === 0
    && white.bishopSquareColors.length === 1 && black.bishopSquareColors.length === 1
  if (!oneBishopEach) return false // K+2 minors vs K: mates exist, so play on
  if (white.bishopSquareColors[0] !== black.bishopSquareColors[0]) return false

  return !portalEnabled(position.rules, 'B')
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
