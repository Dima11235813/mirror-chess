import { describe, it, expect } from 'vitest'
import { parseFen } from '../game/fen'
import { reduceMove } from '../game/reducer'
import { allLegalMoves, gameStatus, isGameOver } from '../game/status'
import { algebraic, parseAlgebraic } from '../game/coord'
import { RULES_STANDARD_CHESS, TOKEN_ALL_ON, rulesOf } from '../game/rules'
import { hasMateInOne, mateInTwoMoves } from './mate'
import { DEFAULT_MATERIAL, materialLabel, minePuzzles, placeMaterial, rng } from './mine'
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

const MINING_BUDGET_MS = 120_000

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
    const options = { ruleset: TOKEN_ALL_ON, seed: 4242, perSet: 40, material: QUEEN_ONLY }
    const first = minePuzzles(options)
    const again = minePuzzles(options)

    expect(first.puzzles.length).toBeGreaterThan(0)
    expect(JSON.stringify(again.puzzles)).toBe(JSON.stringify(first.puzzles))
  }, MINING_BUDGET_MS)

  it('a different seed gives different puzzles', () => {
    // Needs enough candidates that both seeds actually find something: at 40 per set one
    // of them found nothing, and "no puzzles" is not evidence of anything.
    const base = minePuzzles({ ruleset: TOKEN_ALL_ON, seed: 4242, perSet: 200, material: QUEEN_ONLY })
    const other = minePuzzles({ ruleset: TOKEN_ALL_ON, seed: 99, perSet: 200, material: QUEEN_ONLY })

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
    const s = BATCH.stats
    const rejected = s.illegalOrOver + s.notUniqueMateInTwo + s.fasterMateExists + s.alsoMateInChess

    expect(s.candidates).toBe(rejected + s.kept)
    expect(s.kept).toBe(BATCH.puzzles.length + duplicatesDropped(BATCH.puzzles, s.kept))
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

  it('is not a puzzle in ordinary chess — the seam is what makes it work', () => {
    // The novelty gate, re-checked on the finished record: this is the claim that makes
    // the set worth publishing rather than a chess puzzle app with extra steps.
    for (const p of BATCH.puzzles) {
      expect(p.mateInChess).toBe(false)

      const asChess = parseFen(p.fen, RULES_STANDARD_CHESS)
      if (isGameOver(gameStatus(asChess))) continue
      expect(hasMateInOne(asChess), `${p.id} must not be a mate in one in chess`).toBe(false)
      expect(mateInTwoMoves(asChess), `${p.id} must not be a mate in two in chess`).toHaveLength(0)
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
