import type { Board, Color, Coord, Position } from './types'
import { portalCaptures } from './rules'
import { sameCoord, toIndex } from './coord'
import {
  KING_DELTAS,
  KNIGHT_DELTAS,
  slideDirectionsFor,
  stepAcrossSeam,
  walkRay,
  type Direction,
} from './rays'

/* eslint-disable @typescript-eslint/no-use-before-define -- helpers read better after the API */

/**
 * ATTACK GENERATION — `prj-mgmt/epics/rules/mirror-portal-spec.md` §10.1.
 *
 * A square is *attacked* by a color if any piece of that color could capture on it.
 * This is move generation with the standard corrections:
 *
 * - pawns attack their two forward diagonals **unconditionally** (a push is not an
 *   attack),
 * - knight and king attack their whole step set regardless of occupancy,
 * - sliders attack along their rays — **including through the seam** — stopping at
 *   and including the first occupied square.
 *
 * **What does the mirror seam change about this?** Nothing that lives in this file. A ray
 * that crosses the seam is just a longer ray (spec §4, `walkRay`), so there is no
 * precondition to check here and no second walk to keep in step with the first — which is
 * what the 2026-10-03 revision removed. The only seam-aware decision left is *whether* a
 * piece may cross, and that is `portalCaptures`: **attack follows capture** (§12.2), so a
 * piece that may not capture across the seam does not give check across it either.
 */

/**
 * Every square the piece on `from` attacks.
 *
 * @param pos Position to read — board **and** rules, since the same arrangement of
 *   pieces attacks different squares under different rulesets. Never mutated.
 * @param from Square holding the attacking piece.
 * @returns Attacked squares, possibly with duplicates when two rays converge. Empty
 *   when `from` holds no piece.
 */
export function attacksFrom(pos: Position, from: Coord): Coord[] {
  const { board, rules } = pos
  const piece = board[toIndex(from)]
  if (!piece) return []
  // Attack follows capture, never quiet movement (spec §12.2, §12.7).
  const crosses = portalCaptures(rules, piece.kind)

  if (piece.kind === 'P') {
    // Capture diagonals wrap across the seam (§11.2, §11.6); pushes are not attacks.
    const dir = piece.color === 'white' ? 1 : -1
    return stepAttacks(from, [[-1, dir], [1, dir]], crosses)
  }

  if (piece.kind === 'N') return stepAttacks(from, KNIGHT_DELTAS, crosses)
  if (piece.kind === 'K') return stepAttacks(from, KING_DELTAS, crosses)

  const dirs = slideDirectionsFor(piece.kind)
  if (!dirs) return []

  const out: Coord[] = []
  for (const [df, dr] of dirs) {
    for (const { to } of walkRay(board, from, df, dr, crosses)) out.push(to)
  }
  return out
}

/**
 * Squares reachable in one step, occupancy irrelevant (knight, king, pawn diagonals).
 * The file wraps across the seam per spec §11.2, so a knight on `a3` attacks `h5` —
 * unless this piece's portal is switched off, in which case the wrapped destination is
 * discarded and the piece attacks exactly as it would in ordinary chess.
 */
function stepAttacks(from: Coord, deltas: readonly Direction[], crosses: boolean): Coord[] {
  const out: Coord[] = []
  for (const [df, dr] of deltas) {
    const stepped = stepAcrossSeam(from, df, dr)
    if (!stepped) continue
    if (stepped.wrapped && !crosses) continue
    out.push(stepped.to)
  }
  return out
}

/** The squares of `squares` up to and including `target`, or `null` if it is absent. */
function upToTarget(squares: readonly Coord[], target: Coord): Coord[] | null {
  const at = squares.findIndex(s => sameCoord(s, target))
  return at === -1 ? null : squares.slice(0, at + 1)
}

/**
 * The squares of every enemy piece currently giving check to `color`.
 *
 * @param pos Position to read — board and rules. Never mutated.
 * @param color Side whose king may be in check.
 * @returns Attacker squares — more than one in a double check, empty when `color`
 *   is not in check or has no king.
 */
export function checkingPieces(pos: Position, color: Color): Coord[] {
  const king = findKing(pos.board, color)
  if (!king) return []
  const by: Color = color === 'white' ? 'black' : 'white'

  const out: Coord[] = []
  for (let i = 0; i < 64; i++) {
    const piece = pos.board[i]
    if (!piece || piece.color !== by) continue
    const from: Coord = { f: i % 8, r: Math.floor(i / 8) }
    if (attacksFrom(pos, from).some(s => sameCoord(s, king))) out.push(from)
  }
  return out
}

/**
 * The route an attacker travels to reach `king`, for display.
 *
 * @param pos Position to read — board and rules. Never mutated.
 * @param attacker Square of the attacking piece.
 * @param king Square of the attacked king.
 * @returns Squares in order from `attacker` (exclusive) to `king` (inclusive). For a
 *   check through the seam this is the **whole journey** — the approach to the portal
 *   mouth followed by the far-side continuation — so a player can see where the check
 *   comes from. A knight, pawn or king attack yields just `[king]`, having no
 *   intervening squares. Empty when `attacker` does not attack `king`.
 */
export function checkPath(pos: Position, attacker: Coord, king: Coord): Coord[] {
  const { board } = pos
  const piece = board[toIndex(attacker)]
  if (!piece) return []

  const dirs = slideDirectionsFor(piece.kind)
  if (!dirs) {
    return attacksFrom(pos, attacker).some(s => sameCoord(s, king)) ? [king] : []
  }

  const crosses = portalCaptures(pos.rules, piece.kind)
  for (const [df, dr] of dirs) {
    // One walk gives the whole journey, approach and far side together — which is why
    // this function no longer has to stitch two halves around a portal mouth.
    const path = upToTarget(walkRay(board, attacker, df, dr, crosses).map(step => step.to), king)
    if (path) return path
  }
  return []
}

/**
 * Is `square` attacked by any piece of color `by`?
 *
 * @param pos Position to read — board and rules. Never mutated.
 * @param square Target square.
 * @param by Attacking color.
 */
export function isSquareAttacked(pos: Position, square: Coord, by: Color): boolean {
  for (let i = 0; i < 64; i++) {
    const piece = pos.board[i]
    if (!piece || piece.color !== by) continue
    const from: Coord = { f: i % 8, r: Math.floor(i / 8) }
    for (const to of attacksFrom(pos, from)) {
      if (sameCoord(to, square)) return true
    }
  }
  return false
}

/**
 * Locate `color`'s king.
 *
 * @returns The king's square, or `null` for a position that has no such king —
 *   partial test positions are legitimate here (spec §10.2).
 */
export function findKing(board: Board, color: Color): Coord | null {
  for (let i = 0; i < 64; i++) {
    const piece = board[i]
    if (piece && piece.kind === 'K' && piece.color === color) {
      return { f: i % 8, r: Math.floor(i / 8) }
    }
  }
  return null
}

/**
 * Is `color`'s king attacked (spec §10.2)?
 *
 * A position with no king of that color is never in check, which keeps kingless test
 * positions unfiltered.
 */
export function isInCheck(pos: Position, color: Color): boolean {
  const king = findKing(pos.board, color)
  if (!king) return false
  return isSquareAttacked(pos, king, color === 'white' ? 'black' : 'white')
}
