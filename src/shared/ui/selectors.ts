/** Centralized test id prefixes and CSS class names for board hints. */

export const SQUARE_TESTID_PREFIX = 'square-'
export const HINT_TESTID_PREFIX = 'hint-'

export function squareTestId(square: string): string {
  return `${SQUARE_TESTID_PREFIX}${square}`
}

export function hintTestId(square: string): string {
  return `${HINT_TESTID_PREFIX}${square}`
}

/** Classes applied to hint elements inside squares. */
export enum SquareHintClass {
  Hint = 'hint',
  Capture = 'cap',
  // Reserve for future variants (e.g., Mirror):
  Mirror = 'mirror',
  /** Destination for an en passant capture */
  EnPassantDest = 'ep-dest',
  /** Captured pawn square for an en passant capture */
  EnPassantCaptured = 'ep-cap',
}


