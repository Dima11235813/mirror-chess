import type { Board, CastlingRights, Color, Coord, Piece } from './types'
import { algebraic } from './coord'

/**
 * POSITION IDENTITY — what makes two positions "the same" for repetition.
 *
 * **What is this?** A short string that two positions share if and only if they are the
 * same position for the purposes of the threefold-repetition rule.
 *
 * **Why is it here?** Repetition is the one chess rule that cannot be decided from the
 * current position alone — it needs to compare the current position against every
 * earlier one. Comparing whole boards would work but is O(64) per comparison and makes
 * the intent unclear; a key makes "have we been here before?" a set lookup and makes the
 * *definition* of sameness a single readable function.
 *
 * **How does it work?** The board is walked rank 8 down to rank 1 in FEN order, empty
 * squares collapsed to a run length, and the side to move appended. FEN's own format,
 * minus the fields we do not have yet.
 *
 * **What does the mirror seam change about it?** Nothing — and that is worth stating,
 * because it is the first thing a reader will wonder. The seam changes which moves are
 * legal, never which pieces stand where, so identity of a *position* is untouched. Two
 * consequences follow, and both are traps:
 *
 * 1. The key deliberately **excludes the ruleset**. Within one game the ruleset is
 *    constant, so including it would add a byte that never varies. But it means a key is
 *    only comparable against keys from the same game — never share a key-indexed table
 *    across rulesets, or positions with different legal moves will collide. (The engine
 *    hits exactly this trap with its transposition table; see
 *    `prj-mgmt/epics/engine/research/search.md`.)
 * 2. Because the seam is symmetric, a position and its file-mirrored twin are genuinely
 *    *different* positions and must key differently. They do: the key is written in file
 *    order, so mirroring changes it.
 *
 * **What is subtle about the last two fields?** Castling rights and the en-passant square
 * are part of a position's identity in chess and are part of it here too (spec §13.4).
 * Two positions that look identical but differ in whether a castle is still available are
 * *different* positions, and treating them as the same declares draws that are not draws.
 *
 * The en-passant square is included **only when a capture is actually available**. That
 * is the standard treatment, and skipping it is not an optimisation: recording an
 * en-passant square nobody can use would make two positions that differ in nothing
 * observable hash differently, and a repetition that really happened would go unnoticed.
 * Enforcing that condition is the *caller's* job — this function encodes what it is
 * given, and `reducer.ts` is where the square is set to `null` unless a capture exists.
 */

/**
 * The identity of a position for repetition purposes.
 *
 * Branded so a stray string cannot be passed where one is expected: values of this type
 * come from {@link positionKey} and nowhere else.
 */
export type PositionKey = string & { readonly __brand: 'PositionKey' }

/** FEN's letters: uppercase for White, lowercase for Black. */
function pieceChar(piece: Piece): string {
  return piece.color === 'white' ? piece.kind : piece.kind.toLowerCase()
}

/** Everything besides the placement that distinguishes one position from another. */
export interface PositionContext {
  readonly castling: CastlingRights
  /** Already reduced to `null` when no capture is available; see the module note. */
  readonly enPassant: Coord | null
}

/** FEN's castling field: `KQkq`, or `-` when nobody may castle. */
function castlingField(rights: CastlingRights): string {
  const field =
    (rights.white.king ? 'K' : '') +
    (rights.white.queen ? 'Q' : '') +
    (rights.black.king ? 'k' : '') +
    (rights.black.queen ? 'q' : '')
  return field === '' ? '-' : field
}

/**
 * The repetition key of a position.
 *
 * @param board Placement to encode. Never mutated.
 * @param turn Side to move — part of the identity, since the same placement with the
 *   other side to move is a different position (spec §10.4 / FIDE 9.2).
 * @param context Castling rights and the en-passant square, which are equally part of
 *   the identity (spec §13.4).
 * @returns A FEN-style key, e.g.
 *   `"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -"`.
 */
export function positionKey(board: Board, turn: Color, context: PositionContext): PositionKey {
  let key = ''
  for (let rank = 7; rank >= 0; rank--) {
    let empties = 0
    for (let file = 0; file < 8; file++) {
      const piece = board[rank * 8 + file]
      if (!piece) { empties++; continue }
      if (empties > 0) { key += empties; empties = 0 }
      key += pieceChar(piece)
    }
    if (empties > 0) key += empties
    if (rank > 0) key += '/'
  }
  const side = turn === 'white' ? 'w' : 'b'
  const ep = context.enPassant ? algebraic(context.enPassant) : '-'
  return `${key} ${side} ${castlingField(context.castling)} ${ep}` as PositionKey
}
