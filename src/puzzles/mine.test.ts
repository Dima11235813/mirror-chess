import { describe, it, expect } from 'vitest'
import { parseFen } from '../game/fen'
import { reduceMove } from '../game/reducer'
import { allLegalMoves, gameStatus, isGameOver } from '../game/status'
import { algebraic, parseAlgebraic } from '../game/coord'
import { RULES_STANDARD_CHESS, TOKEN_ALL_ON, rulesOf } from '../game/rules'
import { hasMateInOne, mateInTwoMoves } from './mate'
import { bandOf, measureDifficulty } from './difficulty'
import { DEFAULT_MATERIAL, emptyStats, evaluateCandidate, materialLabel, minePuzzles, placeMaterial, rng } from './mine'
import type { Puzzle } from './types'

/**
 * One mined batch, reused by every test below — mining is ~50 ms per candidate, so this
 * file costs roughly **20 seconds**. That is the price of proving the puzzles rather than
 * trusting them, and it is why the batch is shared and the timeouts are explicit.
 * Deterministic, so reusing it is safe.
 */
const BATCH = minePuzzles({ ruleset: TOKEN_ALL_ON, seed: 4242, perSet: 60 })

/** A single cheap material set, for the tests that only need determinism. */
const QUEEN_ONLY = [{ white: ['K', 'Q'] as const, black: ['K'] as const }]

/**
 * The densest shape measured under the revised crossing (2026-10-03): ~8 keepers per 150
 * placements, against the queen's ~2. Used where a test needs to find *something* in a
 * small budget — asserting `length > 0` is what stops a determinism test from comparing
 * two empty arrays and passing for nothing.
 */
const ROOKS_ONLY = [{ white: ['K', 'R', 'R'] as const, black: ['K'] as const }]

const MINING_BUDGET_MS = 120_000

describe('the legality criterion', () => {
  it('rejects a position where the side NOT to move is already in check', () => {
    // Two kings standing next to each other: Black is in check with White to move, so no
    // legal previous move could have produced this board. Added 2026-10-03, after finding
    // that 42% of both shipped sets were positions like this one — every other criterion
    // asks about the mate, and `isGameOver` only ever asks about the side to move.
    const stats = emptyStats()

    expect(evaluateCandidate('w:Ka1,Rc7,Rf4; b:Kb1', TOKEN_ALL_ON, 1, 'KRR-K', stats)).toBeNull()
    expect(stats.blackAlreadyInCheck).toBe(1)
    expect(stats.notUniqueMate).toBe(0)
  })

  it('keeps the same position once the kings are apart', () => {
    // The control: without this, the test above would pass for any rejected candidate.
    const stats = emptyStats()
    const puzzle = evaluateCandidate('w:Ka1,Rc7,Rf4; b:Kh8', TOKEN_ALL_ON, 1, 'KRR-K', stats)

    expect(stats.blackAlreadyInCheck).toBe(0)
    expect(puzzle === null ? 'rejected for another reason' : 'kept').toBeTruthy()
  })
})

describe('placement', () => {
  it('never puts a pawn on the first or last rank — that is an illegal position', () => {
    // A puzzle a player recognises as impossible costs trust the rest of the set must
    // then earn back, so this is a correctness rule and not a cosmetic one.
    const next = rng(11)
    for (let i = 0; i < 400; i++) {
      const spec = placeMaterial(next, { white: ['K', 'P', 'P'], black: ['K', 'P'] })
      if (!spec) continue
      for (const [, square] of spec.matchAll(/P([a-h][1-8])/g)) {
        expect(square).not.toMatch(/[18]$/)
      }
    }
  })

  it('places every requested piece on a distinct square', () => {
    const next = rng(12)
    const spec = placeMaterial(next, { white: ['K', 'B', 'B'], black: ['K', 'N'] })
    const squares = [...spec!.matchAll(/[KQRBNP]([a-h][1-8])/g)].map(m => m[1])

    expect(squares).toHaveLength(5)
    expect(new Set(squares).size).toBe(5)
  })
})

describe('the mined set', () => {
  it('finds puzzles at all', () => {
    expect(BATCH.puzzles.length).toBeGreaterThan(0)
  })

  it('is reproducible from its seed, byte for byte', () => {
    // A set nobody can regenerate cannot be bisected when a puzzle turns out wrong.
    const options = { ruleset: TOKEN_ALL_ON, seed: 4242, perSet: 60, material: ROOKS_ONLY }
    const first = minePuzzles(options)
    const again = minePuzzles(options)

    expect(first.puzzles.length).toBeGreaterThan(0)
    expect(JSON.stringify(again.puzzles)).toBe(JSON.stringify(first.puzzles))
  }, MINING_BUDGET_MS)

  it('a different seed gives different puzzles', () => {
    // Needs enough candidates that both seeds actually find something: at 40 per set one
    // of them found nothing, and "no puzzles" is not evidence of anything. The queen was
    // enough until the legality criterion landed (2026-10-03) and took ~44% of candidates
    // with it; the two-rook shape is the densest measured, so it is the one used here.
    const base = minePuzzles({ ruleset: TOKEN_ALL_ON, seed: 4242, perSet: 200, material: ROOKS_ONLY })
    const other = minePuzzles({ ruleset: TOKEN_ALL_ON, seed: 99, perSet: 200, material: ROOKS_ONLY })

    expect(base.puzzles.length, 'seed 4242 must find puzzles').toBeGreaterThan(0)
    expect(other.puzzles.length, 'seed 99 must find puzzles').toBeGreaterThan(0)

    const ids = new Set(base.puzzles.map(p => p.id))
    expect(other.puzzles.some(p => !ids.has(p.id))).toBe(true)
  }, MINING_BUDGET_MS)

  it('contains no duplicate positions', () => {
    const ids = BATCH.puzzles.map(p => p.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('accounts for every candidate it rejected', () => {
    // `keptAlsoMateInChess` is deliberately NOT in this sum: since the chess differential
    // became a label rather than a gate, it tallies puzzles that were *kept*. Including it
    // double-counts, which is how this test caught the change of meaning.
    //
    // It then did the same job again on 2026-10-03, when `blackAlreadyInCheck` was added:
    // the identity broke immediately and named the gap (300 candidates, 175 accounted
    // for). An accounting identity is a cheap way to make a new rejection reason
    // impossible to add silently.
    const s = BATCH.stats
    const rejected = s.illegalOrOver + s.blackAlreadyInCheck + s.notUniqueMate + s.fasterMateExists

    expect(s.candidates).toBe(rejected + s.kept)
    expect(s.kept).toBe(BATCH.puzzles.length + duplicatesDropped(BATCH.puzzles, s.kept))
    expect(s.keptAlsoMateInChess).toBeLessThanOrEqual(s.kept)
  })
})

/** `kept` counts pre-dedupe, so the difference is the duplicates. */
function duplicatesDropped(puzzles: readonly Puzzle[], kept: number): number {
  return kept - puzzles.length
}

describe('every puzzle keeps its promises', () => {
  it('states a position that is playable, with White to move', () => {
    for (const p of BATCH.puzzles) {
      const state = parseFen(p.fen, rulesOf(p.ruleset))

      expect(state.turn).toBe('white')
      expect(isGameOver(gameStatus(state))).toBe(false)
    }
  })

  it('has exactly one solution, and it is the one recorded', () => {
    for (const p of BATCH.puzzles) {
      const state = parseFen(p.fen, rulesOf(p.ruleset))
      const solutions = mateInTwoMoves(state)

      expect(solutions).toHaveLength(1)
      expect(algebraic(solutions[0]!.from)).toBe(p.solution.from)
      expect(algebraic(solutions[0]!.to)).toBe(p.solution.to)
      expect(p.unique).toBe(true)
    }
  })

  it('offers no faster mate, so the recorded answer is also the best answer', () => {
    for (const p of BATCH.puzzles) {
      expect(hasMateInOne(parseFen(p.fen, rulesOf(p.ruleset)))).toBe(false)
    }
  })

  it('really does force mate — the solution is replayed against every defence', () => {
    // The puzzle's whole claim, checked against the rules rather than the miner that
    // made it. Every reply the opponent has must still lose to a mate.
    for (const p of BATCH.puzzles) {
      const state = parseFen(p.fen, rulesOf(p.ruleset))
      const move = allLegalMoves(state, 'white').find(
        m => algebraic(m.from) === p.solution.from && algebraic(m.to) === p.solution.to,
      )
      expect(move, `solution of ${p.id} must be a legal move`).toBeDefined()

      const afterSolution = reduceMove(state, move!)
      expect(afterSolution).not.toBe(state)

      const replies = allLegalMoves(afterSolution, afterSolution.turn)
      expect(replies.length, `${p.id} must leave the opponent a move`).toBeGreaterThan(0)
      for (const reply of replies) {
        const afterReply = reduceMove(afterSolution, reply)
        if (afterReply === afterSolution) continue
        expect(hasMateInOne(afterReply), `${p.id} must still mate after ${algebraic(reply.to)}`).toBe(true)
      }
    }
  })

  it('labels how much the seam matters, and the label survives re-solving as chess', () => {
    // This used to assert that NO puzzle is a chess mate — the novelty gate. The gate was
    // removed on 2026-09-26 so the library stops being predictable, and the differential
    // became a label. A wrong label is no longer caught by the puzzle simply vanishing,
    // so it is re-derived here instead.
    for (const p of BATCH.puzzles) {
      const asChess = parseFen(p.fen, RULES_STANDARD_CHESS)
      if (isGameOver(gameStatus(asChess))) {
        expect(p.chessDifferential, `${p.id}`).toBe('dead-in-chess')
        continue
      }
      const noMateInChess = mateInTwoMoves(asChess).length === 0 && !hasMateInOne(asChess)
      expect(p.chessDifferential === 'no-mate-in-chess', `${p.id}`).toBe(noMateInChess)
      expect(p.mateInChess, `${p.id} mateInChess must agree with the label`).toBe(!noMateInChess)
    }
  })

  it('bands every puzzle, and the band re-derives from the position', () => {
    for (const p of BATCH.puzzles) {
      const state = parseFen(p.fen, rulesOf(p.ruleset))
      const move = allLegalMoves(state, 'white').find(
        m => algebraic(m.from) === p.solution.from && algebraic(m.to) === p.solution.to,
      )!
      const features = measureDifficulty(state, move, p.features.goalMoves)

      expect(features).toEqual(p.features)
      expect(bandOf(features)).toBe(p.difficulty)
      expect(['easy', 'medium', 'hard']).toContain(p.difficulty)
    }
  })

  it('keeps the seam out of the difficulty band', () => {
    // The band must not move just because a move crossed the seam: that measures
    // unfamiliarity, which decays as a player learns the variant (research §5).
    const seam = BATCH.puzzles.filter(p => p.features.crossedSeam)
    const plain = BATCH.puzzles.filter(p => !p.features.crossedSeam)
    if (seam.length === 0 || plain.length === 0) return

    for (const p of [...seam, ...plain]) {
      const withoutSeam = { ...p.features, crossedSeam: !p.features.crossedSeam }
      expect(bandOf(withoutSeam), `${p.id} band must not depend on the seam`).toBe(p.difficulty)
    }
  })

  it('records the material set it came from', () => {
    const labels = new Set(DEFAULT_MATERIAL.map(materialLabel))

    for (const p of BATCH.puzzles) expect(labels.has(p.material)).toBe(true)
  })

  it('records a solution square that matches the board it describes', () => {
    // Catches an off-by-one between the FEN writer and the move recorder, which would be
    // invisible in every other test here.
    for (const p of BATCH.puzzles) {
      const state = parseFen(p.fen, rulesOf(p.ruleset))
      const piece = state.board[parseAlgebraic(p.solution.from).r * 8 + parseAlgebraic(p.solution.from).f]

      expect(piece, `${p.id} must have a piece on ${p.solution.from}`).not.toBeNull()
      expect(piece!.color).toBe('white')
    }
  })
})
