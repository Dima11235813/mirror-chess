/**
 * THE MINER — turn random material placements into puzzles worth showing a player.
 *
 * **What is this?** A pure, seeded generator: given a material set and a seed, it produces
 * candidate positions and keeps the ones that pass every criterion in {@link CRITERIA}.
 *
 * **Why is it here?** Because a puzzle is a claim a player gets scored against, so the
 * criteria have to be explicit and testable rather than buried in a script. Every field on
 * the record is evidence for one of them.
 *
 * **How does it work?** Measured 2026-09-25, and the numbers are why it is shaped this
 * way. Two sources were tried:
 *
 * | Source | Cost/position | Forced mates | Seam mates |
 * | --- | --- | --- | --- |
 * | positions from random *play* | 223–1253 ms | ~2% | **0** |
 * | random placement of small material | 3–53 ms | 1–11% | many |
 *
 * Game-like positions are a bad source, and the reason is a property of the game rather
 * than a flaw in the mining: the seam makes kings hard to corner, so mates are rare in
 * the middlegame. The seam's *own* mating patterns live in sparse endgames, where a lone
 * bishop mates — which chess cannot do at all.
 *
 * **What is subtle?** Two filters do almost all the work of making a puzzle honest, and
 * neither is obvious:
 *
 * 1. **No faster mate.** A position can have a unique mate in two *and* an immediate mate.
 *    Then the "only answer" is not the best answer, and a player who mates at once would
 *    be told they are wrong. This removes ~30% of otherwise usable candidates, and it was
 *    found only because the engine disagreed with the solver about a mined fixture.
 * 2. **Not also a mate in chess.** With every flag off the position must *not* be a forced
 *    mate. This is the only defensible definition of a novel puzzle — the answer changes
 *    when the seam closes — and it is the same differential habit the rest of the repo
 *    uses (ADR 0002), with two rulesets in place of two implementations.
 *
 * **What does the mirror seam change about this?** It is the entire product. A puzzle that
 * would also be a puzzle in chess teaches nothing about this game, so it is thrown away
 * however pretty it is.
 */
import { fromPiecesSpec } from '../game/setup'
import { toFen } from '../game/fen'
import { gameStatus, isGameOver } from '../game/status'
import { algebraic } from '../game/coord'
import { RULES_STANDARD_CHESS, rulesOf, type RuleSetToken } from '../game/rules'
import { hasMateInOne, mateInTwoMoves } from './mate'
import { PUZZLE_SCHEMA, type Puzzle, type PuzzleMove } from './types'
import type { GameState, Kind, Move } from '../game/types'

/** The criteria a candidate must pass, in the order they are cheapest to check. */
export const CRITERIA = [
  'the position is legal and the game is not already over',
  'exactly one first move forces mate in two',
  'no faster mate exists, so the unique answer is also the best answer',
  'with every portal flag off it is not a forced mate — the seam is what makes it work',
] as const

/** A material set to mine, as piece kinds per side. */
export interface MaterialSet {
  readonly white: readonly Kind[]
  readonly black: readonly Kind[]
}

/** `"KBB-KN"`, for grouping puzzles and reporting yield per set. */
export function materialLabel(set: MaterialSet): string {
  return `${set.white.join('')}-${set.black.join('')}`
}

/**
 * The sets worth mining, with their measured mate yields.
 *
 * Chosen by measurement, not taste: `K+B vs K` is the marquee shape because a lone bishop
 * cannot mate in chess at all, and `K+B+B vs K+N` was the densest source of mates in two
 * (10% of placements, 30 of 31 of them chess-impossible).
 */
export const DEFAULT_MATERIAL: readonly MaterialSet[] = [
  { white: ['K', 'B', 'B'], black: ['K', 'N'] },
  { white: ['K', 'B', 'N'], black: ['K'] },
  { white: ['K', 'Q'], black: ['K'] },
  { white: ['K', 'R', 'B'], black: ['K', 'P'] },
  { white: ['K', 'B'], black: ['K'] },
]

/**
 * A seeded pseudo-random source.
 *
 * A linear congruential generator, so a whole puzzle set is reproducible from one integer.
 * `Math.random` would make a mined set impossible to regenerate or to bisect.
 */
export function rng(seed: number): () => number {
  let state = seed >>> 0
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const FILES = 'abcdefgh'

/** Algebraic name of board index `i`, counting from `a1`. */
function squareName(i: number): string {
  return `${FILES[i % 8]}${Math.floor(i / 8) + 1}`
}

/**
 * Place a material set on distinct random squares.
 *
 * Pawns are kept off ranks 1 and 8: a pawn there is an illegal position, not a hard
 * puzzle, and a puzzle a player recognises as impossible costs trust that the rest of the
 * set has to earn back.
 *
 * @returns A `fromPiecesSpec` string, or `null` if placement failed (a tiny board and a
 *   run of unlucky draws), which the caller should simply skip.
 */
export function placeMaterial(next: () => number, set: MaterialSet): string | null {
  const used = new Set<number>()
  const pick = (): number => {
    for (let attempt = 0; attempt < 60; attempt++) {
      const i = Math.floor(next() * 64)
      if (used.has(i)) continue
      used.add(i)
      return i
    }
    return -1
  }

  const sideSpec = (kinds: readonly Kind[]): string | null => {
    const parts: string[] = []
    for (const kind of kinds) {
      let i = pick()
      while (kind === 'P' && i >= 0 && (i < 8 || i >= 56)) i = pick()
      if (i < 0) return null
      parts.push(kind + squareName(i))
    }
    return parts.join(',')
  }

  const white = sideSpec(set.white)
  const black = sideSpec(set.black)
  return white && black ? `w:${white}; b:${black}` : null
}

function describeMove(move: Move): PuzzleMove {
  const from = algebraic(move.from)
  const to = algebraic(move.to)
  return {
    from,
    to,
    promotion: move.promotion,
    crossedSeam: move.crossedSeam,
    coordinate: `${from}-${to}${move.crossedSeam ? '*' : ''}`,
  }
}

/** Stable identity, so the same position mined twice collides instead of duplicating. */
function puzzleId(fen: string, ruleset: RuleSetToken): string {
  let hash = 0
  for (const ch of `${ruleset}|${fen}`) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return (hash >>> 0).toString(36).padStart(7, '0')
}

/** What a rejected candidate failed on, for reporting yield honestly. */
export interface MineStats {
  candidates: number
  illegalOrOver: number
  notUniqueMateInTwo: number
  fasterMateExists: number
  alsoMateInChess: number
  kept: number
}

export function emptyStats(): MineStats {
  return { candidates: 0, illegalOrOver: 0, notUniqueMateInTwo: 0, fasterMateExists: 0, alsoMateInChess: 0, kept: 0 }
}

/**
 * Test one position against every criterion.
 *
 * @param spec A `fromPiecesSpec` placement.
 * @param ruleset The rules the puzzle is played under.
 * @param stats Mutated to record which criterion rejected the candidate. The one place
 *   this module keeps state, and it exists so a disappointing run can be diagnosed
 *   instead of guessed at.
 * @returns The puzzle, or `null` if it failed any criterion.
 */
export function evaluateCandidate(
  spec: string,
  ruleset: RuleSetToken,
  seed: number,
  material: string,
  stats: MineStats,
): Puzzle | null {
  stats.candidates++
  const state: GameState = fromPiecesSpec(spec, 'white', rulesOf(ruleset))
  if (isGameOver(gameStatus(state))) { stats.illegalOrOver++; return null }

  const solutions = mateInTwoMoves(state)
  if (solutions.length !== 1) { stats.notUniqueMateInTwo++; return null }

  // Criterion 3. See the module note: without this the "only answer" is not the best one.
  if (hasMateInOne(state)) { stats.fasterMateExists++; return null }

  // Criterion 4, the novelty gate: the same position, with the seam closed.
  const asChess = fromPiecesSpec(spec, 'white', RULES_STANDARD_CHESS)
  const chessIsOver = isGameOver(gameStatus(asChess))
  const mateInChess = !chessIsOver && (hasMateInOne(asChess) || mateInTwoMoves(asChess).length > 0)
  if (mateInChess) { stats.alsoMateInChess++; return null }

  stats.kept++
  const fen = toFen(state)
  return {
    schema: PUZZLE_SCHEMA,
    id: puzzleId(fen, ruleset),
    fen,
    ruleset,
    sideToMove: 'white',
    goal: 'mate-in-2',
    material,
    solution: describeMove(solutions[0]!),
    unique: true,
    mateInChess: false,
    source: 'composed',
    seed,
  }
}

export interface MineOptions {
  readonly ruleset: RuleSetToken
  readonly seed: number
  /** Candidate placements to try **per material set**. */
  readonly perSet: number
  readonly material?: readonly MaterialSet[]
}

/**
 * Mine puzzles deterministically.
 *
 * @param options Ruleset, seed and how many placements to try per material set.
 * @returns The puzzles found, deduplicated by position, and the rejection tally.
 */
export function minePuzzles(options: MineOptions): { puzzles: Puzzle[]; stats: MineStats } {
  const sets = options.material ?? DEFAULT_MATERIAL
  const stats = emptyStats()
  const byId = new Map<string, Puzzle>()

  for (const [setIndex, set] of sets.entries()) {
    // One stream per set, derived from the seed, so adding a set cannot change the
    // puzzles produced for the sets before it.
    const next = rng(options.seed + setIndex * 7919)
    const label = materialLabel(set)

    for (let i = 0; i < options.perSet; i++) {
      const spec = placeMaterial(next, set)
      if (!spec) continue
      const puzzle = evaluateCandidate(spec, options.ruleset, options.seed, label, stats)
      if (puzzle && !byId.has(puzzle.id)) byId.set(puzzle.id, puzzle)
    }
  }

  return { puzzles: [...byId.values()], stats }
}
