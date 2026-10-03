import type { Board, Coord } from './types'
import { toIndex } from './coord'

/**
 * Ray geometry shared by move generation and attack generation.
 *
 * Both derive from `prj-mgmt/epics/rules/mirror-portal-spec.md` §4 (sliders) and §11
 * (steppers), with §10.1 for their use in attacks, so the geometry lives here and neither
 * module owns it.
 *
 * **What does the mirror seam change about this file? Everything, and in one place.**
 * Since the 2026-10-03 revision both exported movement primitives are the same rule — the
 * file wraps `a ↔ h`, the rank does what the move already said — so {@link walkRay} and
 * {@link stepAcrossSeam} differ only in that one walks and the other jumps. Every other
 * module in `src/game/*` consumes them and knows nothing about the seam.
 */

/** A ray direction as `(df, dr)` file/rank deltas. */
export type Direction = readonly [number, number]

export const ROOK_DIRECTIONS: readonly Direction[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
export const BISHOP_DIRECTIONS: readonly Direction[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
export const QUEEN_DIRECTIONS: readonly Direction[] = [...ROOK_DIRECTIONS, ...BISHOP_DIRECTIONS]

/** The king steps one square in every queen direction. */
export const KING_DELTAS: readonly Direction[] = QUEEN_DIRECTIONS

export const KNIGHT_DELTAS: readonly Direction[] = [
  [1, 2], [2, 1], [2, -1], [1, -2],
  [-1, -2], [-2, -1], [-2, 1], [-1, 2],
]

/** Where a stepper lands after applying an offset, and whether it crossed the seam. */
export interface SteppedSquare {
  readonly to: Coord
  /** True when the offset ran off the `a`/`h` edge and re-entered on the far side. */
  readonly wrapped: boolean
}

/**
 * Apply a stepper's offset, wrapping the file across the seam (spec §11.2).
 *
 * The file of the destination wraps; the rank is whatever the stepper's own move
 * dictates. Where the offset stays on the board this is the identity, so standard
 * chess is unchanged.
 *
 * Since 2026-10-03 this is also what a slider does, one step at a time — see
 * {@link walkRay}. There is one crossing in this game (spec §11.1).
 *
 * @param from Origin square.
 * @param df File offset; `|df| <= 2` for every stepper, so at most one crossing.
 * @param dr Rank offset.
 * @returns The destination, or `null` when the **rank** leaves the board — ranks
 *   never wrap, there is no top or bottom portal.
 */
export function stepAcrossSeam(from: Coord, df: number, dr: number): SteppedSquare | null {
  const r = from.r + dr
  if (r < 0 || r > 7) return null
  const rawFile = from.f + df
  return { to: { f: (rawFile + 8) % 8, r }, wrapped: rawFile < 0 || rawFile > 7 }
}

/** The slide directions a piece of the given kind uses, or `null` if it is not a slider. */
export function slideDirectionsFor(kind: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'): readonly Direction[] | null {
  switch (kind) {
    case 'B': return BISHOP_DIRECTIONS
    case 'R': return ROOK_DIRECTIONS
    case 'Q': return QUEEN_DIRECTIONS
    default: return null
  }
}

/** One square of a walked ray, and whether the ray crossed the seam to reach it. */
export interface RayStep {
  readonly to: Coord
  /** True from the wrapping step onward — the ray crossed to get here (spec §4.1). */
  readonly crossed: boolean
}

/**
 * Walk a slider ray from `from` in direction `(df, dr)` — **spec §4**.
 *
 * A ray here is an ordinary chess ray on a board whose **files wrap**. Each step
 * advances the rank by `dr` and the file by `df` modulo 8, so a ray leaving the board
 * across the `a`- or `h`-file re-enters on the other side and carries on in the same
 * direction. The rank advances through the crossing exactly as the direction dictates,
 * which is what makes a diagonal stay a diagonal — and keeps a bishop colour-bound,
 * since a `±7` file change has the same parity as `±1` (spec §7).
 *
 * **What does the mirror seam change about this?** One `% 8`, and nothing else. The
 * geometry never branches on whether a crossing happened: `crossed` is carried along
 * only so callers can label the move for the UI and the notation. That is what lets the
 * engine precompute these paths per ruleset and keep the seam out of its hot loop
 * (ADR 0003).
 *
 * **Why it terminates** — worth stating, because the loop has no explicit bound. With
 * `dr != 0` the rank leaves the board within 7 steps. With `dr == 0` the file is a cycle
 * of 8, so the ray meets its own origin within 8 steps and stops there. No direction has
 * `df == dr == 0`, so one of the two always applies, and a ray is therefore **at most 7
 * squares — the same bound as chess** (spec §7).
 *
 * @param board Occupancy to read. Never mutated.
 * @param from Origin square, excluded from the result.
 * @param df File delta per step; `dr` rank delta per step.
 * @param canCross May this ray wrap at all? `false` reproduces standard chess sliding,
 *   which is how a piece whose portal right is switched off is generated.
 * @returns Squares in walk order, **including** the first occupied square it meets
 *   (a blocker is attacked, and is a capture when it is an enemy — callers decide).
 *   Stops before the origin, so a wrapped rank ray cannot loop.
 */
export function walkRay(
  board: Board,
  from: Coord,
  df: number,
  dr: number,
  canCross: boolean,
): RayStep[] {
  const out: RayStep[] = []
  let f = from.f
  let r = from.r
  let crossed = false

  for (;;) {
    r += dr
    if (r < 0 || r > 7) return out // ranks never wrap: there is no top or bottom seam
    const rawFile = f + df
    if (rawFile < 0 || rawFile > 7) {
      if (!canCross) return out // this piece may not cross; the board edge is a wall
      crossed = true
    }
    f = (rawFile + 8) % 8
    if (f === from.f && r === from.r) return out // a wrapped rank ray meets itself

    const to: Coord = { f, r }
    out.push({ to, crossed })
    if (board[toIndex(to)]) return out // blocked — the blocking square is included
  }
}
