/**
 * PUZZLE RECORDS — what a mined puzzle is, and what it carries as proof.
 *
 * **What is this?** The shape of one puzzle: a position, the rules it is played under, the
 * unique solution, and the evidence that it is worth showing a player.
 *
 * **Why is it here?** A puzzle is a *claim* — "there is exactly one move here that forces
 * mate". A record that carried only the position and an answer would be unfalsifiable
 * later; these fields are the receipts, so a suspect puzzle can be re-checked without
 * re-mining, and so a bug in the miner leaves evidence rather than silently bad puzzles.
 *
 * **What is subtle?** Two fields are the whole point of the format, and both are claims
 * about *other* rulesets rather than this one:
 *
 * - `unique` — no other first move also forces mate. Without it a puzzle UI rejects
 *   correct answers, which is worse than having no puzzle.
 * - `mateInChess` — whether the same position is also a forced mate with every portal
 *   flag **off**. When it is `false`, the puzzle exists *because* of the seam, and that is
 *   the only defensible definition of "novel" we have. Measured 2026-09-25: 12 of 12
 *   K+B vs K mates were chess-impossible.
 *
 * **What does the mirror seam change about this?** It is why `ruleset` is not optional
 * metadata but part of the puzzle's identity. The same board with the same side to move is
 * a different puzzle under a different token, often with a different answer — which is
 * exactly what `mateInChess` records.
 */
import type { RuleSetToken } from '../game/rules'
import type { Color, PromotionKind } from '../game/types'

/** The format version. Bumped when a field changes meaning, never when one is appended. */
export const PUZZLE_SCHEMA = 1

/** What a solver is being asked to achieve. Only one goal exists so far. */
export type PuzzleGoal = 'mate-in-2'

/** Where a puzzle's position came from, so the library can be filtered by provenance. */
export type PuzzleSource =
  /** Random placement of a chosen material set — a composed study, not a played game. */
  | 'composed'
  /** Reached by play. Not yet a source: self-play is degenerate until evaluation lands. */
  | 'selfplay'

/**
 * One move of a solution, in coordinates.
 *
 * **Deliberately not SAN.** Spec §8.5 adopted the `*` seam tag, but nothing renders it
 * yet — that ships with the move log. Recording coordinates now keeps the puzzle set
 * honest: it stores what the engine actually produced, and a renderer can be added later
 * without re-mining. `coordinate` is the human-readable form of the same data.
 */
export interface PuzzleMove {
  readonly from: string
  readonly to: string
  readonly promotion: PromotionKind | null
  /** Did this move cross the seam? Presentation and filtering only, never a rule input. */
  readonly crossedSeam: boolean
  /** `"d4-h8*"`, the `*` marking a seam crossing. */
  readonly coordinate: string
}

/** A mined puzzle, with the evidence for every claim it makes. */
export interface Puzzle {
  readonly schema: typeof PUZZLE_SCHEMA
  /** Stable identity: derived from the position and the ruleset, so duplicates collide. */
  readonly id: string
  readonly fen: string
  readonly ruleset: RuleSetToken
  readonly sideToMove: Color
  readonly goal: PuzzleGoal
  /** The material, as `"KB-K"`, for grouping and for reporting yield by set. */
  readonly material: string
  /** The one first move that forces mate. */
  readonly solution: PuzzleMove
  /** True when no other first move also forces mate — verified, not assumed. */
  readonly unique: boolean
  /** True when this is *also* a forced mate with every flag off. A novel puzzle is `false`. */
  readonly mateInChess: boolean
  readonly source: PuzzleSource
  /** The seed that produced this position, so the whole set is reproducible. */
  readonly seed: number
}

/** A mined set, with everything needed to reproduce it exactly. */
export interface PuzzleSet {
  readonly schema: typeof PUZZLE_SCHEMA
  readonly goal: PuzzleGoal
  readonly ruleset: RuleSetToken
  readonly generatedBy: string
  readonly seed: number
  readonly candidates: number
  readonly puzzles: readonly Puzzle[]
}
