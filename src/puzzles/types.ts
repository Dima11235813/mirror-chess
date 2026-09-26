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
 * - `chessDifferential` — how much the seam matters, graded by re-solving the same position
 *   with every portal flag **off**. It is a *label*, not a gate: a library where the seam
 *   always matters is predictable, and unpredictability is the appeal.
 *
 * **What does the mirror seam change about this?** It is why `ruleset` is not optional
 * metadata but part of the puzzle's identity. The same board with the same side to move is
 * a different puzzle under a different token, often with a different answer — which is
 * exactly what `chessDifferential` records.
 */
import type { RuleSetToken } from '../game/rules'
import type { Color, PromotionKind } from '../game/types'
import type { DifficultyBand, DifficultyFeatures } from './difficulty'

/** The format version. Bumped when a field changes meaning, never when one is appended. */
export const PUZZLE_SCHEMA = 2

/** What a solver is being asked to achieve. */
export type PuzzleGoal = 'mate-in-2' | 'mate-in-3'

/**
 * How much the seam matters to this puzzle, graded.
 *
 * **This used to be a rejection gate and is now a label** (owner, 2026-09-26). Every puzzle
 * in the v1 set was impossible in chess, which made the library predictable in exactly the
 * way that spoils it: "this is Mirror Chess, so the seam is involved" was true 161 times
 * out of 161, and a player learns that in an evening. A library that mixes seam-dependent
 * puzzles with ordinary chess tactics keeps the real question open — *does the seam matter
 * here at all?* — which is the appeal.
 */
export type ChessDifferential =
  /** The position is not even a live game in chess: insufficient material, or already over. */
  | 'dead-in-chess'
  /** Live in chess, but no forced mate exists there. The seam creates the win. */
  | 'no-mate-in-chess'
  /** A forced mate exists in chess too, but it is a different move. The seam changes the answer. */
  | 'different-mate-in-chess'
  /** The same key move mates in chess. An ordinary tactic that happens to live here. */
  | 'same-mate-in-chess'

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
  /** How much the seam matters here — a label, not a gate. See {@link ChessDifferential}. */
  readonly chessDifferential: ChessDifferential
  /** How hard it looks, and why. Never a rating — see `difficulty.ts`. */
  readonly difficulty: DifficultyBand
  readonly features: DifficultyFeatures
  /** The one first move that forces mate. */
  readonly solution: PuzzleMove
  /** True when no other first move also forces mate — verified, not assumed. */
  readonly unique: boolean
  /**
   * True when this is *also* a forced mate with every flag off.
   *
   * Kept for continuity with the v1 set; {@link ChessDifferential} is the graded form and
   * the one to read. No longer implies the puzzle was rejected — see the type's note.
   */
  readonly mateInChess: boolean
  readonly source: PuzzleSource
  /** The seed that produced this position, so the whole set is reproducible. */
  readonly seed: number
}

/** A mined set, with everything needed to reproduce it exactly. */
export interface PuzzleSet {
  readonly schema: typeof PUZZLE_SCHEMA
  /** Every goal present. A mixed set is the point — see {@link ChessDifferential}. */
  readonly goals: readonly PuzzleGoal[]
  readonly ruleset: RuleSetToken
  readonly generatedBy: string
  readonly seed: number
  readonly candidates: number
  readonly puzzles: readonly Puzzle[]
}
