import type { Kind, Piece } from '@game/types'
import { SquareHintClass } from './selectors'

/**
 * How a board square is presented: which hint marker it carries, and how it is
 * described to a screen reader.
 *
 * This module decides **presentation only**. Every fact it consumes — whether a
 * square is a legal destination, a capture, a portal move, or the square of a checked
 * king — is derived by the game core and passed in. No rule is re-derived here
 * (CLAUDE.md §2).
 */

/** What a hint on a square means. */
export type SquareHintKind =
  | 'move'
  | 'capture'
  | 'mirror-move'
  | 'mirror-capture'
  | 'en-passant'
  | 'castle'
  | 'promotion'
  | 'promotion-capture'

/** A square's role in the current check, if any. */
export type SquareCheckRole =
  | 'king-in-check'
  | 'king-mated'
  | 'king-stalemated'
  | 'checker'
  | 'check-path'

/** Everything needed to present one square. */
export interface SquarePresentation {
  /** Algebraic name, e.g. `"e4"`. */
  readonly square: string
  readonly piece: Piece | null
  readonly hint: SquareHintKind | null
  readonly checkRole: SquareCheckRole | null
  readonly selected: boolean
}

const PIECE_NAMES: Readonly<Record<Kind, string>> = {
  K: 'king',
  Q: 'queen',
  R: 'rook',
  B: 'bishop',
  N: 'knight',
  P: 'pawn',
}

const HINT_CLASSES: Readonly<Record<SquareHintKind, readonly SquareHintClass[]>> = {
  'move': [],
  'capture': [SquareHintClass.Capture],
  'mirror-move': [SquareHintClass.Mirror],
  'mirror-capture': [SquareHintClass.Mirror, SquareHintClass.Capture],
  'en-passant': [SquareHintClass.EnPassantDest],
  'castle': [SquareHintClass.Castle],
  'promotion': [SquareHintClass.Promotion],
  'promotion-capture': [SquareHintClass.Promotion, SquareHintClass.Capture],
}

const HINT_DESCRIPTIONS: Readonly<Record<SquareHintKind, string>> = {
  'move': 'legal move',
  'capture': 'legal capture',
  'mirror-move': 'legal mirror move through the seam',
  'mirror-capture': 'legal mirror capture through the seam',
  'en-passant': 'legal en passant capture',
  'castle': 'legal castle',
  'promotion': 'legal move, promotes',
  'promotion-capture': 'legal capture, promotes',
}

const CHECK_DESCRIPTIONS: Readonly<Record<SquareCheckRole, string>> = {
  'king-in-check': 'in check',
  'king-mated': 'checkmated',
  'king-stalemated': 'stalemated',
  'checker': 'giving check',
  'check-path': 'on the checking line',
}

/**
 * CSS classes for the hint marker on a square.
 *
 * @param kind What the hint means.
 * @returns A space-separated class list, always including the base hint class.
 */
export function hintClassesFor(kind: SquareHintKind): string {
  return [SquareHintClass.Hint, ...HINT_CLASSES[kind]].join(' ')
}

/**
 * The accessible name for a square.
 *
 * Every visual cue on the board has a counterpart here — a hint's kind, a portal
 * move, the checked king, the piece giving check — so nothing is conveyed by colour
 * or shape alone (CLAUDE.md §7).
 *
 * @param p What to describe.
 * @returns A comma-separated description, e.g.
 *   `"h4, empty, legal mirror move through the seam"`.
 */
export function describeSquare(p: SquarePresentation): string {
  const parts: string[] = [p.square, describeOccupant(p.piece)]
  if (p.selected) parts.push('selected')
  if (p.checkRole) parts.push(CHECK_DESCRIPTIONS[p.checkRole])
  if (p.hint) parts.push(HINT_DESCRIPTIONS[p.hint])
  return parts.join(', ')
}

function describeOccupant(piece: Piece | null): string {
  return piece ? `${piece.color} ${PIECE_NAMES[piece.kind]}` : 'empty'
}
