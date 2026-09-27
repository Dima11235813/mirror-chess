export const SPEC_C6_Q_WRAP = 'b:Qc6,Pd6,Pg6'

export type Turn = 'white' | 'black'

/** Scenario description for e2e/component tests that drive the board via URL. */
export interface BoardScenario {
  readonly name: string
  readonly spec: string
  readonly turn: Turn
  /** Square to click to select a piece, e.g., 'a3'. */
  readonly select: string
  /** Squares where a move hint must exist after selection. */
  readonly mustHints: readonly string[]
  /** Squares where a move hint must NOT exist after selection. */
  readonly mustNotHints?: readonly string[]
}

/**
 * A board URL for a position.
 *
 * @param rules Optional ruleset token or registered alias (`'BRQ---'`, `'sliders'`).
 *   Omitted means the default ruleset, which is what most tests want.
 * @param clock Optional starting value for the 50-move counter. The only practical way
 *   to reach that rule in a test — playing a hundred halfmoves through the UI is not one.
 */
export function urlForSpec(spec: string, turn: Turn = 'white', rules?: string, clock?: number): string {
  const q = new URLSearchParams({
    board: spec,
    turn,
    ...(rules ? { rules } : {}),
    ...(clock !== undefined ? { clock: String(clock) } : {}),
  }).toString()
  return `/?${q}`
}

/** Convenience to derive the URL directly from a `BoardScenario`. */
export function urlForScenario(s: BoardScenario): string {
  return urlForSpec(s.spec, s.turn)
}

