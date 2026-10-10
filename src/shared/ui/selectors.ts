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
  /**
   * A destination of a piece being **previewed** rather than played — an enemy piece, or
   * any piece once the game is over. Added alongside the normal hint class, so a preview
   * keeps its kind (capture, mirror, castle) while reading as "not yours to tap".
   */
  Preview = 'preview',
  /** The destination of a move chosen but not yet submitted (auto-submit off). */
  Held = 'held',
}

/*
 * Confirming a move before it is played.
 * Story: `prj-mgmt/epics/user-moves/move-piece/submit-move.md`.
 */
export const SUBMIT_BAR_TESTID = 'submit-bar'
export const SUBMIT_MOVE_TESTID = 'submit-move'
export const CANCEL_MOVE_TESTID = 'cancel-move'
export const HELD_TESTID = 'held-destination'

/** The settings dialog and its controls. */
export const SETTINGS_OPEN_TESTID = 'settings-open'
export const SETTINGS_DIALOG_TESTID = 'settings-dialog'
export const SETTINGS_AUTOSUBMIT_TESTID = 'settings-autosubmit'
export const SETTINGS_RESET_TESTID = 'settings-reset'
export const SETTINGS_CLOSE_TESTID = 'settings-close'

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

/*
 * A block of text that holds its height whatever it says, and the control that reveals
 * the rest of it when it does not fit. Component: `src/components/ReservedText/`.
 * Story: `prj-mgmt/epics/quality/layout-shift.md`.
 */
/**
 * The space held for the submit bar while confirm-before-move is on.
 *
 * It carries a test id so a test can assert the one thing the fix actually guarantees:
 * that this block is the same height whether or not a move is waiting. Measuring
 * something further down the page instead proves nothing, because `.app` has a `1fr` grid
 * row that absorbs a block growing by 35px and keeps absorbing until the page runs out of
 * slack — at which point everything below moves at once. That is why the bug reached a
 * phone and not a desktop (`prj-mgmt/epics/quality/layout-shift.md`).
 */
export const SUBMIT_BAR_SLOT_TESTID = 'submit-bar-slot'

export const RESERVED_TEXT_CLASS = 'reservedText'
export const RESERVED_TEXT_BODY_CLASS = 'reservedTextBody'
export const RESERVED_TEXT_MORE_CLASS = 'reservedTextMore'

/** What the last save-file import did — announced, not left to the console. */
export const IMPORT_MESSAGE_TESTID = 'import-message'

/** A square on the route the solution travelled, marked only after solving. */
export const ROUTE_CLASS = 'route'

/*
 * Watch mode — two engines playing, with their reasoning on screen.
 * Story: `prj-mgmt/epics/balance/watch-a-game.md`.
 */
export const WATCH_SCREEN_TESTID = 'watch-screen'
export const WATCH_MODE_TESTID = 'watch-mode'
export const WATCH_PLAY_TESTID = 'watch-play'
export const WATCH_STEP_TESTID = 'watch-step'
export const WATCH_RESET_TESTID = 'watch-reset'
export const WATCH_STATUS_TESTID = 'watch-status'
export const WATCH_LOG_TESTID = 'watch-log'
/** The indifference gauge: how many moves the evaluation cannot tell apart. */
export const WATCH_GAUGE_TESTID = 'watch-gauge'
