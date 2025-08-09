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

export function urlForSpec(spec: string, turn: Turn = 'white'): string {
  const q = new URLSearchParams({ board: spec, turn }).toString()
  return `/?${q}`
}

/** Convenience to derive the URL directly from a `BoardScenario`. */
export function urlForScenario(s: BoardScenario): string {
  return urlForSpec(s.spec, s.turn)
}

