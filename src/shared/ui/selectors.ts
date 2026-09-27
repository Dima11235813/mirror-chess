/** Centralized test id prefixes and CSS class names for board hints. */

export const SQUARE_TESTID_PREFIX = 'square-'
export const HINT_TESTID_PREFIX = 'hint-'

/** The footer live region announcing turn / check / checkmate / stalemate. */
export const GAME_STATUS_TESTID = 'game-status'

/** The live region explaining why an attempted move was rejected. */
export const MOVE_MESSAGE_TESTID = 'move-message'

/** Classes applied to a square to show its role in the current check. */
export enum SquareStateClass {
  Selected = 'sel',
  /** The king of the side to move, currently attacked. */
  Check = 'check',
  /** The king of the side to move, checkmated. */
  Mate = 'mate',
  /** The king of the side to move, stalemated. */
  Stalemate = 'stalemate',
  /** An enemy piece delivering check. */
  Checker = 'checker',
  /** A square the check travels through, including across the seam. */
  CheckPath = 'check-path',
}

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
  /** Destination of a castling move — the king's landing square */
  Castle = 'castle',
  /** Destination where a pawn promotes */
  Promotion = 'promo',
}

/** Opponent selection, strength, and the engine's live "thinking" region. */
export const OPPONENT_SIDE_TESTID = 'opponent-side'
export const OPPONENT_DIFFICULTY_TESTID = 'opponent-difficulty'
export const ENGINE_STATUS_TESTID = 'engine-status'

/** The promotion picker, and one button per piece it offers. */
export const PROMOTION_DIALOG_TESTID = 'promotion-picker'

export function promotionOptionTestId(kind: string): string {
  return `promote-${kind}`
}



/** The puzzle screen: the prompt, the verdict, the reveal, and its controls. */
export const PUZZLE_SCREEN_TESTID = 'puzzle-screen'
export const PUZZLE_PROMPT_TESTID = 'puzzle-prompt'
export const PUZZLE_VERDICT_TESTID = 'puzzle-verdict'
export const PUZZLE_REVEAL_TESTID = 'puzzle-reveal'
export const PUZZLE_NEXT_TESTID = 'puzzle-next'
export const PUZZLE_MODE_TESTID = 'puzzle-mode'
/** The difficulty band — a coarse label, never a rating. See `src/puzzles/difficulty.ts`. */
export const PUZZLE_BAND_TESTID = 'puzzle-band'

/** What the last save-file import did — announced, not left to the console. */
export const IMPORT_MESSAGE_TESTID = 'import-message'

/** A square on the route the solution travelled, marked only after solving. */
export const ROUTE_CLASS = 'route'
