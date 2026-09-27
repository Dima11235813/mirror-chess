import type { Color, Coord, Move, MovePosition, Piece, Position, PromotionKind } from './types'
import { toIndex, insideBoard, mirrorFile, sameCoord } from './coord'
import { applyMoveToBoard } from './board'
import { isInCheck, isSquareAttacked } from './attacks'
import { portalCaptures, portalEnabled, portalQuiet } from './rules'
import {
  PROMOTION_KINDS,
  makeMove,
  pawnDirection,
  pawnStartRank,
  promotionRank,
} from './move'
import {
  BISHOP_DIRECTIONS,
  KING_DELTAS,
  KNIGHT_DELTAS,
  QUEEN_DIRECTIONS,
  ROOK_DIRECTIONS,
  portalMouth,
  stepAcrossSeam,
  type Direction,
} from './rays'

/**
 * MOVE GENERATION — derived from `prj-mgmt/epics/rules/mirror-portal-spec.md`.
 *
 * Standard chess generation for every piece, plus the **mirror portal**:
 *
 * - **Sliders cross by transit** (§4). The `a`-file and `h`-file are linked at equal rank
 *   (`a4 ↔ h4`). A Bishop, Rook or Queen whose ray reaches its edge square with a clear
 *   path — and finds that square empty — steps through the seam to the mirrored file **on
 *   the same rank** and keeps sliding in the same direction.
 * - **Steppers cross by wrapping the file** of their landing square while keeping the
 *   rank their own move dictates (§11) — a knight on `a3` reaches `h5, g4, g2, h1`, never
 *   `h3`.
 * - Whether either applies is decided **per piece and per right**: each kind separately
 *   holds the right to *move* across the seam and to *capture* across it (§12). This file
 *   reads `rules` and never assumes.
 * - `legalMovesFor` additionally drops any move that would leave the mover's own king
 *   attacked (§10.3).
 *
 * **The special moves (§13)** are here too, and each meets the seam differently:
 *
 * | Rule | Meets the seam? |
 * | --- | --- |
 * | Promotion | Only via a capture — a pawn's push has no file component, but its capture diagonals wrap, so `a7` may promote by capturing onto `h8` |
 * | En passant | **Yes.** Stated as "any pawn that *attacks* the passed-over square", which inherits the wrap: a pawn on `a5` may capture a pawn that played `h7–h5` |
 * | Castling | **No.** `b1 c1 d1 e1 f1 g1` contains no edge file, and the rook's travel crosses nothing. But its check tests use seam-aware attacks, so a rook in one corner can forbid castling in the other |
 *
 * Generation takes a {@link MovePosition}, never a `GameState`: the halfmove clock and
 * repetition history must be out of reach, because a move does not become illegal
 * because the game is over, and letting draw state in here is what makes a perft count
 * wrong.
 *
 * If this file disagrees with the spec, this file is wrong.
 */

/**
 * Generate the moves for the piece on `from` that are legal to play — pseudo-legal
 * generation with self-check filtering (§10.3) applied.
 *
 * Turn is deliberately *not* checked here — the caller decides whose move it is — so
 * the function can also be used to inspect a position (tests, hints, analysis).
 *
 * @param position Board, rules, castling rights and the en-passant square. Never mutated.
 * @param from Square to generate moves for.
 * @returns Legal moves in generation order. Empty when `from` holds no piece.
 *   In a position with no king of the mover's color nothing is filtered, so partial
 *   test positions behave as pure §4 generation.
 */
export function legalMovesFor(position: MovePosition, from: Coord): Move[] {
  const piece = position.board[toIndex(from)]
  if (!piece) return []
  return pseudoLegalMovesFor(position, from).filter(
    m => !isInCheck({ board: applyMoveToBoard(position.board, m), rules: position.rules }, piece.color),
  )
}

/**
 * Generate the moves for the piece on `from` **without** the self-check filter.
 *
 * This is the geometry generator. Prefer {@link legalMovesFor} for anything a player can
 * act on; this exists for legality filtering itself and for testing §4 in isolation.
 *
 * **Castling is the one exception to "pseudo".** Its three check tests — not out of,
 * through, or into check — are part of the castling rule rather than the general
 * king-safety filter, and the filter *cannot* substitute for them: it only inspects the
 * final position, so it would happily allow a king to pass through an attacked square.
 * They are therefore evaluated here, and castling moves emitted by this function are
 * already fully legal.
 *
 * @param position Position to read. Never mutated.
 * @param from Square to generate moves for.
 * @returns Pseudo-legal moves, deduped by destination: when a square is reachable
 *   both normally and through the seam, only the standard move survives (spec §4
 *   "Classification / dedupe"). Empty when `from` holds no piece.
 */
export function pseudoLegalMovesFor(position: MovePosition, from: Coord): Move[] {
  const piece = position.board[toIndex(from)]
  if (!piece) return []

  const acc: Move[] = []
  switch (piece.kind) {
    case 'P':
      pushAll(acc, pawnMoves(position, from, piece))
      break
    case 'N':
      pushAll(acc, stepMoves(position, from, piece, KNIGHT_DELTAS))
      break
    case 'K':
      pushAll(acc, stepMoves(position, from, piece, KING_DELTAS))
      pushAll(acc, castlingMoves(position, from, piece))
      break
    case 'B':
      pushAll(acc, sliderMoves(position, from, piece, BISHOP_DIRECTIONS))
      break
    case 'R':
      pushAll(acc, sliderMoves(position, from, piece, ROOK_DIRECTIONS))
      break
    case 'Q':
      pushAll(acc, sliderMoves(position, from, piece, QUEEN_DIRECTIONS))
      break
  }
  return dedupeMoves(acc)
}

function pushAll<T>(out: T[], xs: readonly T[]): void { for (const x of xs) out.push(x) }

/**
 * A slider's moves: its ordinary rays, plus the portal extension when this piece crosses
 * the seam at all. Keeping the check here rather than in each `case` is what stops
 * bishop, rook and queen from drifting apart.
 */
function sliderMoves(position: Position, from: Coord, p: Piece, dirs: readonly Direction[]): Move[] {
  const res = slideMoves(position, from, p, dirs)
  if (portalEnabled(position.rules, p.kind)) pushAll(res, portalMoves(position, from, p, dirs))
  return res
}

/**
 * Pawn pushes, double pushes, diagonal captures, promotion and en passant (§13.1, §13.2).
 *
 * Pushes have `df = 0` and so never cross the seam (§11.2) — a pawn's journey to
 * promotion is unaffected. Its **capture** diagonals do wrap, and that single fact
 * produces both of this file's surprises: a pawn may promote by capturing across the
 * seam, and en passant may happen between pawns seven files apart.
 */
function pawnMoves(position: MovePosition, from: Coord, p: Piece): Move[] {
  const { board } = position
  const dir = pawnDirection(p.color)
  const res: Move[] = []

  const forward: Coord = { f: from.f, r: from.r + dir }
  if (insideBoard(forward) && !board[toIndex(forward)]) {
    pushAll(res, pawnAdvance(from, forward, p.color, 'quiet'))

    const twoForward: Coord = { f: from.f, r: from.r + 2 * dir }
    if (from.r === pawnStartRank(p.color) && insideBoard(twoForward) && !board[toIndex(twoForward)]) {
      res.push(makeMove(from, twoForward, 'doublePush'))
    }
  }

  // A pawn's only seam crossing is a capture, so only the capture right applies (§12.4).
  const capturesAcross = portalCaptures(position.rules, p.kind)
  for (const df of [-1, 1]) {
    const stepped = stepAcrossSeam(from, df, dir)
    if (!stepped || (stepped.wrapped && !capturesAcross)) continue

    const target = board[toIndex(stepped.to)]
    if (target && target.color !== p.color) {
      pushAll(res, pawnAdvance(from, stepped.to, p.color, 'capture', stepped.wrapped))
      continue
    }
    // En passant: the rule is stated in terms of *attack* (§13.2), and this loop is
    // exactly the pawn's attack set — so the seam arrives for free, with no clause of
    // its own. The right is already gated above by `capturesAcross`.
    if (!target && position.enPassant && sameCoord(stepped.to, position.enPassant)) {
      res.push(makeMove(from, stepped.to, 'enPassant', { crossedSeam: stepped.wrapped }))
    }
  }
  return res
}

/**
 * One pawn move to `to`, expanded into four promotions when it lands on the far rank.
 *
 * Four moves, never one: a promotion choice is part of the move, and collapsing it is the
 * classic perft undercount.
 */
function pawnAdvance(
  from: Coord,
  to: Coord,
  color: Color,
  base: 'quiet' | 'capture',
  crossedSeam = false,
): Move[] {
  if (to.r !== promotionRank(color)) {
    return [makeMove(from, to, base, { crossedSeam })]
  }
  const flag = base === 'capture' ? 'promotionCapture' : 'promotion'
  return PROMOTION_KINDS.map((promotion: PromotionKind) =>
    makeMove(from, to, flag, { promotion, crossedSeam }),
  )
}

/**
 * Single-step moves (knight, king), wrapping the file across the seam (spec §11).
 * A destination reached by wrapping is marked `crossedSeam`.
 */
function stepMoves(position: Position, from: Coord, p: Piece, deltas: readonly Direction[]): Move[] {
  const res: Move[] = []
  const quietAcross = portalQuiet(position.rules, p.kind)
  const captureAcross = portalCaptures(position.rules, p.kind)
  for (const [df, dr] of deltas) {
    const stepped = stepAcrossSeam(from, df, dr)
    if (!stepped) continue
    const target = position.board[toIndex(stepped.to)]
    if (target && target.color === p.color) continue
    // Across the seam the two rights are decided separately (spec §12).
    if (stepped.wrapped && !(target ? captureAcross : quietAcross)) continue
    res.push(makeMove(from, stepped.to, target ? 'capture' : 'quiet', { crossedSeam: stepped.wrapped }))
  }
  return res
}

/** The rank a colour's back row sits on. */
function homeRank(color: Color): number {
  return color === 'white' ? 0 : 7
}

/** Files that must be empty between king and rook, and the squares the king crosses. */
const CASTLE_GEOMETRY = {
  castleKing: { rookFile: 7, emptyFiles: [5, 6], kingPath: [4, 5, 6], kingTo: 6 },
  castleQueen: { rookFile: 0, emptyFiles: [1, 2, 3], kingPath: [4, 3, 2], kingTo: 2 },
} as const

/**
 * Castling (spec §13.3) — ordinary chess, with seam-aware check tests.
 *
 * Everything here is plain chess geometry, and that is a *finding* rather than an
 * oversight: none of `b c d e f g` is an edge file, so the king's two-square step and the
 * rook's jump cannot reach a seam to cross. The roadmap's worry that §11 might let the
 * castling step wrap is unreachable in the standard game and is left unspecified.
 *
 * What the seam *does* change is who may forbid it. `isSquareAttacked` sees through the
 * portal, so an enemy rook on `a1` — which attacks `h1, g1, f1, e1` across the seam —
 * can forbid White's **kingside** castle from the opposite corner. That falls out for
 * free, and it is the reason this function must never take a chess-shaped shortcut such
 * as "only look along the first rank".
 *
 * The rights are also re-checked against the board. `fromPiecesSpec` can build any
 * position, and a right without the king and rook actually at home is meaningless.
 */
function castlingMoves(position: MovePosition, from: Coord, king: Piece): Move[] {
  const rank = homeRank(king.color)
  if (from.r !== rank || from.f !== 4) return [] // not a king at home; no castle to offer

  const rights = position.castling[king.color]
  const enemy: Color = king.color === 'white' ? 'black' : 'white'
  const res: Move[] = []

  for (const flag of ['castleKing', 'castleQueen'] as const) {
    const held = flag === 'castleKing' ? rights.king : rights.queen
    if (!held) continue

    const geometry = CASTLE_GEOMETRY[flag]
    const rook = position.board[toIndex({ f: geometry.rookFile, r: rank })]
    if (!rook || rook.kind !== 'R' || rook.color !== king.color) continue
    if (geometry.emptyFiles.some(f => position.board[toIndex({ f, r: rank })])) continue

    // Not out of, through, or into check — all three, with portal-aware attacks.
    if (geometry.kingPath.some(f => isSquareAttacked(position, { f, r: rank }, enemy))) continue

    res.push(makeMove(from, { f: geometry.kingTo, r: rank }, flag))
  }
  return res
}

/** Standard sliding along each direction: stop at the first piece, capture if enemy. */
function slideMoves(position: Position, from: Coord, p: Piece, dirs: readonly Direction[]): Move[] {
  const res: Move[] = []
  for (const [df, dr] of dirs) {
    let f = from.f + df
    let r = from.r + dr
    while (insideBoard({ f, r })) {
      const to: Coord = { f, r }
      const target = position.board[toIndex(to)]
      if (!target) res.push(makeMove(from, to, 'quiet'))
      else {
        if (target.color !== p.color) res.push(makeMove(from, to, 'capture'))
        break
      }
      f += df
      r += dr
    }
  }
  return res
}

/**
 * The mirror portal (spec §4): for every ray with a horizontal component that
 * reaches an empty edge square with a clear path, hop across the seam — same rank —
 * and keep sliding in the same direction.
 *
 * @returns Destinations on the far side of the seam, each marked `crossedSeam`.
 *   At most one seam crossing per ray, and the origin square terminates the far-side
 *   walk so a rank ray can never loop.
 */
function portalMoves(position: Position, from: Coord, p: Piece, dirs: readonly Direction[]): Move[] {
  const res: Move[] = []
  const quietAcross = portalQuiet(position.rules, p.kind)
  const captureAcross = portalCaptures(position.rules, p.kind)
  for (const [df, dr] of dirs) {
    if (df === 0) continue // vertical rays never portal (spec §6)
    const edge = portalMouth(position.board, from, df, dr)
    if (!edge) continue

    // The hop is horizontal only: rank is preserved (spec §4, "trap to avoid").
    const entry = mirrorFile(edge)
    let f = entry.f
    let r = entry.r
    while (insideBoard({ f, r })) {
      const to: Coord = { f, r }
      if (sameCoord(to, from)) break // the ray came back around to ourselves
      const target = position.board[toIndex(to)]
      if (!target) {
        // An empty far-side square needs the quiet right; the ray walks on regardless,
        // since being unable to *land* there does not stop the piece passing through.
        if (quietAcross) res.push(makeMove(from, to, 'quiet', { crossedSeam: true }))
      } else {
        if (target.color !== p.color && captureAcross) {
          res.push(makeMove(from, to, 'capture', { crossedSeam: true }))
        }
        break
      }
      f += df
      r += dr
    }
  }
  return res
}

/**
 * Collapse duplicate destinations.
 *
 * A square reachable both normally and through the seam is kept as the **standard**
 * move (spec §4), and a square reachable by two portal rays is emitted once. The
 * promotion piece is part of the key, so the four promotions to one square all survive.
 */
function dedupeMoves(moves: readonly Move[]): Move[] {
  const standardDestinations = new Set<string>()
  for (const m of moves) {
    if (!m.crossedSeam) standardDestinations.add(`${toIndex(m.to)}|${m.promotion ?? ''}`)
  }

  const seen = new Set<string>()
  const out: Move[] = []
  for (const m of moves) {
    const destination = `${toIndex(m.to)}|${m.promotion ?? ''}`
    if (m.crossedSeam && standardDestinations.has(destination)) continue
    const key = `${destination}|${m.crossedSeam}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(m)
  }
  return out
}
