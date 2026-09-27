import type { CastlingRights, Color, Coord, Move, MoveFlag, PromotionKind } from './types'

/**
 * MOVE CONSTRUCTION AND DERIVATION — the single place a `Move` is built or unpacked.
 *
 * **What is this?** One factory, and the handful of questions worth asking about a move
 * once it exists: is it a capture, which square does it capture on, what does the rook do
 * when the king castles.
 *
 * **Why is it here?** Two reasons that arrived independently
 * (`prj-mgmt/epics/engine/task-move-shape.md`). One is correctness: the captured square
 * used to be *stored* alongside the destination, and two sources of truth can diverge.
 * The other is performance: a type with optional properties has one hidden class per
 * combination, so every consumer of `Move` was polymorphic. Building every move through
 * {@link makeMove} makes the shape identical everywhere.
 *
 * **What does the mirror seam change about it?** Almost nothing, and that is the point.
 * A move that crossed the seam records `crossedSeam` for the UI, but no rule reads it.
 * The seam changes *which* moves are generated — that is `moves.ts`'s business — not what
 * a move *is*. Keeping the distinction sharp is why `crossedSeam` is documented as
 * presentation-only rather than left to look like a rule flag.
 */

/** Flags whose move removes an enemy piece. */
const CAPTURE_FLAGS: readonly MoveFlag[] = ['capture', 'enPassant', 'promotionCapture']

/** Flags whose move is a castle. */
const CASTLE_FLAGS: readonly MoveFlag[] = ['castleKing', 'castleQueen']

/** Flags whose move ends with a pawn becoming something else. */
const PROMOTION_FLAGS: readonly MoveFlag[] = ['promotion', 'promotionCapture']

/**
 * Build a move. The only sanctioned way to create one.
 *
 * @param from Origin square.
 * @param to Destination square.
 * @param flag What kind of move this is; decides how it applies.
 * @param options `promotion` is required by the two promotion flags and forbidden
 *   otherwise; `crossedSeam` marks a portal move for the UI.
 */
export function makeMove(
  from: Coord,
  to: Coord,
  flag: MoveFlag,
  options: { readonly promotion?: PromotionKind; readonly crossedSeam?: boolean } = {},
): Move {
  return {
    from,
    to,
    flag,
    promotion: options.promotion ?? null,
    crossedSeam: options.crossedSeam ?? false,
  }
}

/** Does this move remove an enemy piece? */
export function isCapture(move: Move): boolean {
  return CAPTURE_FLAGS.includes(move.flag)
}

/** Is this move a castle? */
export function isCastle(move: Move): boolean {
  return CASTLE_FLAGS.includes(move.flag)
}

/** Does this move promote a pawn? */
export function isPromotion(move: Move): boolean {
  return PROMOTION_FLAGS.includes(move.flag)
}

/**
 * The square holding the piece this move captures, or `null` for a non-capture.
 *
 * **Derived, never stored.** For every capture but one the victim stands on the
 * destination. The exception is en passant, where the victim is the pawn that just
 * double-pushed: it sits on the destination's *file*, on the **capturing pawn's own
 * rank** — `from.r`, not an offset from `to.r`.
 *
 * Writing it as `from.r` rather than "one rank behind `to`" is what makes this correct at
 * the seam. An en-passant capture may cross the seam (spec §13.2), so `to.f` can be seven
 * files away from `from.f` — but the two pawns are always side by side *on a rank*, which
 * is the invariant that survives the crossing.
 */
export function capturedSquare(move: Move): Coord | null {
  if (!isCapture(move)) return null
  if (move.flag !== 'enPassant') return move.to
  return { f: move.to.f, r: move.from.r }
}

/** Where a castling rook starts and ends, given the king's move. */
export interface RookTravel { readonly from: Coord; readonly to: Coord }

/**
 * The rook's half of a castle, derived from the king's move.
 *
 * The rank comes from the king, so this is colour-agnostic; the files are the fixed
 * chess ones. No seam arithmetic appears here, and that is a *finding* rather than an
 * omission — the squares involved are `a c d e f g h` on one rank, and the rook's travel
 * `a1→d1` / `h1→f1` never reaches an edge it could cross (spec §13.3).
 *
 * @param move A castling move. Returns `null` for anything else.
 */
export function rookTravelFor(move: Move): RookTravel | null {
  if (!isCastle(move)) return null
  const rank = move.from.r
  return move.flag === 'castleKing'
    ? { from: { f: 7, r: rank }, to: { f: 5, r: rank } }
    : { from: { f: 0, r: rank }, to: { f: 3, r: rank } }
}

/** The rank a pawn of this colour promotes on. */
export function promotionRank(color: Color): number {
  return color === 'white' ? 7 : 0
}

/** The rank a pawn of this colour starts on, from which a double push is legal. */
export function pawnStartRank(color: Color): number {
  return color === 'white' ? 1 : 6
}

/** The direction a pawn of this colour advances. */
export function pawnDirection(color: Color): number {
  return color === 'white' ? 1 : -1
}

/** The pieces a pawn may promote to, in the order a UI should offer them. */
export const PROMOTION_KINDS: readonly PromotionKind[] = ['Q', 'R', 'B', 'N']

/**
 * Nobody may castle. The right starting point for an analysis position built piece by
 * piece, where a castle would be an accident rather than a fact about the game.
 */
export const NO_CASTLING_RIGHTS: CastlingRights = {
  white: { king: false, queen: false },
  black: { king: false, queen: false },
}
