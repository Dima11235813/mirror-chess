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
 * 2. **The chess differential is graded, not gated.** Every candidate is re-solved with
 *    every portal flag off, and what that produces is a *label* — the same differential
 *    habit the rest of the repo uses (ADR 0002), with two rulesets in place of two
 *    implementations.
 *
 * **What does the mirror seam change about this?** It is the entire product, and the reason
 * the differential stopped being a gate (owner, 2026-09-26). A library where the seam always
 * matters is a library a player can predict: "this is Mirror Chess, so the seam is involved"
 * was true 161 times out of 161 in the first set. Mixing in ordinary chess tactics keeps the
 * real question open — *does the seam matter here at all?* — which is the appeal.
 */
import { fromPiecesSpec } from '../game/setup'
import { isInCheck } from '../game/attacks'
import { toFen } from '../game/fen'
import { gameStatus, isGameOver } from '../game/status'
import { algebraic } from '../game/coord'
import { RULES_STANDARD_CHESS, rulesOf, type RuleSetToken } from '../game/rules'
import { fastestMateIn, forcedMateMoves } from './mate'
import { bandOf, measureDifficulty } from './difficulty'
import { search } from '../engine/search'
import { movesToMate, type Depth } from '../engine/types'
import { PUZZLE_SCHEMA, type ChessDifferential, type Puzzle, type PuzzleGoal, type PuzzleMove } from './types'
import type { GameState, Kind, Move } from '../game/types'

/** The criteria a candidate must pass, in the order they are cheapest to check. */
export const CRITERIA = [
  'the position is legal and the game is not already over',
  'exactly one first move forces mate in the requested number of moves',
  'no faster mate exists, so the unique answer is also the best answer',
] as const

// What is no longer a criterion: until 2026-09-26 a candidate was rejected unless it was
// impossible in chess. That made every puzzle a seam puzzle, which makes the library
// predictable — a player learns in an evening that the seam is always involved, and the
// interesting question, *does it matter here?*, is answered before they look. The
// differential is now recorded as a label; ordinary chess tactics are welcome in the set.

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
 * **Chosen by measurement, not taste — and re-measured 2026-10-03**, when the revised seam
 * crossing (spec §4) made a bishop colour-bound again. The previous list was measured under
 * the old crossing and every one of its premises inverted, which is worth keeping visible:
 *
 * | shape | old rule | new rule (150 placements, mate in two) |
 * | --- | --- | --- |
 * | `K+B vs K` | the marquee shape — a lone bishop mated, which chess cannot do | **dead material.** 150 of 150 placements are already drawn (`draw-rules.ts`) |
 * | `K+B+B vs K+N` | densest source, 10% of placements, 30 of 31 chess-impossible | **0 kept** |
 * | `K+B+N vs K` | kept | 0 kept |
 * | `K+R+R vs K` | not tried | **8 kept** — the densest now |
 * | `K+Q vs K` | kept | 2 kept, **both chess-impossible, one with a seam solution** |
 * | `K+R+N vs K` | not tried | 2 kept |
 * | `K+B+B vs K` | not tried | 1 kept, chess-impossible — opposite colours still mate |
 * | `K+R+B vs K+P` | kept | 1 kept |
 * | `K+R vs K`, `K+N+N vs K`, `K+Q vs K+P`, `K+R vs K+P` | not tried | 0 kept |
 *
 * The shape of the answer changed with the rule: chess-impossibility used to come from a
 * bishop reaching the *other square colour*, and now comes from **rank-wrapping rooks and
 * queens** and from steppers crossing — neither of which the revision touched. Yield fell
 * by roughly an order of magnitude, so a set of a given size costs ten times the compute.
 */
export const DEFAULT_MATERIAL: readonly MaterialSet[] = [
  { white: ['K', 'R', 'R'], black: ['K'] },
  { white: ['K', 'Q'], black: ['K'] },
  { white: ['K', 'R', 'N'], black: ['K'] },
  { white: ['K', 'B', 'B'], black: ['K'] },
  { white: ['K', 'R', 'B'], black: ['K', 'P'] },
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

/**
 * Where every candidate went, for reporting yield honestly.
 *
 * **`keptAlsoMateInChess` is not a rejection reason.** It counts puzzles that were *kept*
 * and happen to mate in chess too — until 2026-09-26 that was a rejection, and the name
 * outlived the meaning. The accounting identity is therefore:
 *
 * ```
 * candidates = illegalOrOver + blackAlreadyInCheck + notUniqueMate + fasterMateExists + kept
 * ```
 */
export interface MineStats {
  candidates: number
  illegalOrOver: number
  /**
   * Rejected because the side **not** to move is already in check — a position that
   * cannot arise in a game, since the previous move would have been illegal.
   *
   * **Added 2026-10-03, and it should have been here from the start.** The first two sets
   * this miner shipped contained these: 121 of 285 in `puzzles.v2.json` and 100 of 238 in
   * the first v3 mine, both about 42%. Nothing caught them, because every other criterion
   * is about the *mate* and `isGameOver` only asks about the side to move. Found while
   * reading one candidate closely enough to notice two kings standing next to each other.
   */
  blackAlreadyInCheck: number
  notUniqueMate: number
  fasterMateExists: number
  /** A tally over the kept puzzles, not a rejection — see the note above. */
  keptAlsoMateInChess: number
  kept: number
}

/** A zeroed tally, for a caller that aggregates several runs. */
export function emptyStats(): MineStats {
  return {
    candidates: 0,
    illegalOrOver: 0,
    blackAlreadyInCheck: 0,
    notUniqueMate: 0,
    fasterMateExists: 0,
    keptAlsoMateInChess: 0,
    kept: 0,
  }
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
  goal: PuzzleGoal = 'mate-in-2',
): Puzzle | null {
  const goalMoves = goal === 'mate-in-3' ? 3 : 2
  stats.candidates++
  const state: GameState = fromPiecesSpec(spec, 'white', rulesOf(ruleset))
  if (isGameOver(gameStatus(state))) { stats.illegalOrOver++; return null }

  // The side **not** to move may not be in check: no legal previous move could have left
  // the board that way, so it is not a position, whatever the solver proves about it. A
  // player who sees two kings touching stops trusting the rest of the set, and is right to.
  if (isInCheck(state, 'black')) { stats.blackAlreadyInCheck++; return null }

  // Proving a mate in three costs ~100x proving a mate in two, and the expensive case is
  // the common one — there usually is no mate. The engine finds mates fast with alpha-beta
  // and ordering, so it screens first and the exhaustive solver only *proves* survivors.
  // A false negative here costs yield, never correctness: nothing enters the set unproved.
  if (goalMoves === 3) {
    const seen = search(state, { maxDepth: 5 as Depth })
    if (movesToMate(seen.score) !== 3) { stats.notUniqueMate++; return null }
  }

  const solutions = forcedMateMoves(state, goalMoves)
  if (solutions.length !== 1) { stats.notUniqueMate++; return null }

  // Without this the "only answer" is not the best answer, and a player who mates sooner
  // is told they are wrong. It cost a broken fixture to learn.
  if (fastestMateIn(state, goalMoves - 1) !== null) { stats.fasterMateExists++; return null }

  const solution = solutions[0]!
  const differential = gradeDifferential(spec, solution, goalMoves)
  if (differential === 'same-mate-in-chess' || differential === 'different-mate-in-chess') {
    stats.keptAlsoMateInChess++
  }

  const features = measureDifficulty(state, solution, goalMoves)
  stats.kept++
  const fen = toFen(state)
  return {
    schema: PUZZLE_SCHEMA,
    id: puzzleId(fen, ruleset),
    fen,
    ruleset,
    sideToMove: 'white',
    goal,
    material,
    chessDifferential: differential,
    difficulty: bandOf(features),
    features,
    solution: describeMove(solution),
    unique: true,
    mateInChess: differential === 'same-mate-in-chess' || differential === 'different-mate-in-chess',
    source: 'composed',
    seed,
  }
}

/**
 * How much the seam matters: re-solve the same position with every portal flag off.
 *
 * Graded rather than boolean, because "impossible in chess" spans a dead position (a lone
 * bishop, which chess calls insufficient material) and a position where chess simply has no
 * forced win. Those are not equally interesting, and the format could not tell them apart.
 */
function gradeDifferential(spec: string, solution: Move, goalMoves: number): ChessDifferential {
  const asChess = fromPiecesSpec(spec, 'white', RULES_STANDARD_CHESS)
  if (isGameOver(gameStatus(asChess))) return 'dead-in-chess'

  const chessSolutions = forcedMateMoves(asChess, goalMoves)
  const faster = fastestMateIn(asChess, goalMoves - 1)
  if (chessSolutions.length === 0 && faster === null) return 'no-mate-in-chess'

  const sameMove = chessSolutions.some(
    m => m.from.f === solution.from.f && m.from.r === solution.from.r &&
         m.to.f === solution.to.f && m.to.r === solution.to.r,
  )
  return sameMove ? 'same-mate-in-chess' : 'different-mate-in-chess'
}

/** What to mine, and how much of it. */
export interface MineOptions {
  readonly ruleset: RuleSetToken
  readonly seed: number
  /** Candidate placements to try **per material set**. */
  readonly perSet: number
  readonly material?: readonly MaterialSet[]
  /** What to look for. Mate in 3 costs ~15x more per candidate — measured, not guessed. */
  readonly goal?: PuzzleGoal
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
      const puzzle = evaluateCandidate(spec, options.ruleset, options.seed, label, stats, options.goal)
      if (puzzle && !byId.has(puzzle.id)) byId.set(puzzle.id, puzzle)
    }
  }

  return { puzzles: [...byId.values()], stats }
}
