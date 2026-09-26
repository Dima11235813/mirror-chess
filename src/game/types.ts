import type { RuleSet } from './rules'
import type { PositionKey } from './position-key'

/** Color of a side. */
export type Color = 'white' | 'black'

/** Color constants to avoid magic strings */
export const WHITE: Color = 'white'
export const BLACK: Color = 'black'
export const COLORS: readonly [Color, Color] = [WHITE, BLACK] as const

/** Files [0..7] left→right (a..h), Ranks [0..7] bottom→top from White's POV. */
export interface Coord { readonly f: number; readonly r: number }

export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'

export interface Piece { readonly kind: Kind; readonly color: Color }

export type Board = ReadonlyArray<Piece | null> // length 64

/**
 * What kind of move this is — the one field that decides how it is applied.
 *
 * Closed on purpose. Every move is exactly one of these, so applying a move is a
 * `switch` with no fallthrough and no "does this optional field exist?" guessing. The
 * captured square is **derived** from the flag and the destination
 * (see `capturedSquare`), never stored, so the two can never disagree.
 */
export type MoveFlag =
  | 'quiet'
  | 'capture'
  | 'doublePush'
  | 'enPassant'
  | 'castleKing'
  | 'castleQueen'
  | 'promotion'
  | 'promotionCapture'

/** The pieces a pawn may become. Never a King, never a Pawn. */
export type PromotionKind = Exclude<Kind, 'K' | 'P'>

/**
 * A single move.
 *
 * **Every field is required and always assigned.** That is not tidiness: optional
 * properties give a type with `n` of them `2^n` hidden classes in V8, which makes every
 * site that consumes a `Move` polymorphic. With one shape, they are all monomorphic, and
 * it costs nothing in clarity (`prj-mgmt/epics/engine/task-move-shape.md`).
 *
 * @see makeMove — the single factory. Do not build a `Move` by hand; going through the
 *   factory is what guarantees the one shape.
 */
export interface Move {
  readonly from: Coord
  readonly to: Coord
  readonly flag: MoveFlag
  /** The piece a pawn becomes. Non-null exactly when the flag is a promotion. */
  readonly promotion: PromotionKind | null
  /**
   * Did this move cross the mirror seam?
   *
   * **Presentation only — never a rule input.** The generator knows it for free, so it is
   * recorded rather than re-derived, but nothing in `moves.ts`, `reducer.ts` or the
   * future engine may branch on it: the rules are decided by geometry and `RuleSet`, and
   * a second, redundant switch is exactly how the first build grew five contradictory
   * notions of "mirror". The UI reads it to draw portal destinations differently.
   */
  readonly crossedSeam: boolean
}

/**
 * Which castles each side has not yet forfeited (spec §13.3).
 *
 * Named by the rook's side of the board rather than by "long" and "short", because the
 * king's *direction* is what the flag really means and the words for it differ by
 * tradition. `king` is toward the `h`-file, `queen` toward the `a`-file.
 */
export interface SideCastlingRights {
  readonly king: boolean
  readonly queen: boolean
}

/**
 * Castling availability for both sides.
 *
 * "Available" means only that neither the king nor that rook has moved and the rook has
 * not been captured. Whether a castle is *legal right now* — squares empty, king not out
 * of, through or into check — depends on the position and is decided during generation,
 * never stored here.
 */
export type CastlingRights = Readonly<Record<Color, SideCastlingRights>>

/**
 * A board together with the rules it is played under — everything **attack** generation
 * needs, and nothing more.
 *
 * Whether a square is attacked is a property of a *position*, not of a board alone: the
 * same arrangement of pieces yields different attacks under different rulesets. It is
 * *not* affected by castling rights or the en-passant square, which is why those live one
 * level up in {@link MovePosition} rather than here. Keeping attacks unable to see them
 * is deliberate — it makes it impossible to write the classic bug where a castling right
 * quietly influences check detection.
 */
export interface Position {
  readonly board: Board
  readonly rules: RuleSet
}

/**
 * Everything **move** generation needs: a {@link Position}, plus the two facts about the
 * game's past that create moves the board alone cannot show.
 *
 * This is the middle of three deliberately separate contracts, and the split is the same
 * one FEN makes:
 *
 * | Contract | Adds | Answers |
 * | --- | --- | --- |
 * | {@link Position} | board, rules | what attacks what |
 * | `MovePosition` | castling rights, en-passant square | what moves exist |
 * | {@link GameState} | turn, clock, history | how the game stands |
 *
 * Search sees this one. It never sees `GameState`, so the halfmove clock and repetition
 * history cost it nothing — and, more importantly, cannot leak into a perft count.
 */
export interface MovePosition extends Position {
  readonly castling: CastlingRights
  readonly enPassant: Coord | null
}

/**
 * A position plus everything the *game* knows that the position alone does not.
 *
 * Every `GameState` is usable as a {@link Position}, and that split is load-bearing:
 * move and attack generation take the narrower `Position`, so the fields below cost
 * search nothing. Perft and the future engine never see them.
 *
 * The three history fields exist for the draw rules
 * (`prj-mgmt/epics/rules/draw-rules.md`), which are the only chess rules not decidable
 * from a position alone.
 */
export interface GameState extends MovePosition {
  readonly turn: Color
  readonly inCheck: boolean
  /**
   * Halfmoves since the last capture or pawn move — the 50-move rule's clock.
   *
   * Reset to `0` by either, incremented by everything else. A draw is claimable at
   * `100` (fifty moves *by each side*, which is the part everyone gets wrong).
   */
  readonly halfmoveClock: number
  /**
   * The positions that have occurred since the last **irreversible** move, most recent
   * last, including the current position. Never empty.
   *
   * Truncating at a capture or pawn move is not an optimisation but the exact rule: both
   * change material or pawn structure permanently, so no earlier position can ever recur.
   * The invariant `history.length - 1 <= halfmoveClock` therefore always holds, with
   * equality for any game played from its own start; a position loaded mid-game may have
   * a clock without the history that produced it.
   */
  readonly history: readonly PositionKey[]
  /**
   * Halfmoves played since this state was created. Not a chess rule — the backstop that
   * stops automated play running forever (see `gameStatus`'s `maxPlies`).
   */
  readonly plies: number
}


