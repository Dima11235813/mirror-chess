import { describe, it, expect } from 'vitest'
import { initialPosition, fromPiecesSpec } from './setup'
import { perft, perftDivide, moveKey } from './perft'
import { allLegalMoves } from './status'
import { legalMovesFor } from './moves'
import { reduceMove } from './reducer'
import { isInCheck } from './attacks'
import { algebraic, parseAlgebraic } from './coord'
import { parseFen } from './fen'
import {
  RULES_ALL_ON,
  RULES_SLIDERS_ONLY,
  RULES_STANDARD_CHESS,
  TOKEN_ALL_ON,
  TOKEN_SLIDERS_ONLY,
  TOKEN_STANDARD_CHESS,
} from './rules'

/**
 * Move generation verified by node counts.
 *
 * The standard-chess block is the only test in this project checked against an
 * authority **outside** it. Everything else — the spec's worked examples, the legality
 * suite — verifies us against ourselves.
 */

describe('perft: ordinary chess, against published counts', () => {
  /**
   * The canonical perft results for the chess starting position, published and
   * independently reproduced by many engines.
   *
   * Depth 5 is now included. It was previously omitted because it is the first depth at
   * which **en passant** appears (258 of them) and this engine had no en passant; spec
   * §13 fixed that, and the number matching is part of the evidence that it did.
   */
  const PUBLISHED: readonly (readonly [depth: number, nodes: number])[] = [
    [1, 20],
    [2, 400],
    [3, 8_902],
    [4, 197_281],
    [5, 4_865_609],
  ]

  it.each(PUBLISHED)('perft(%i) = %i', (depth, nodes) => {
    expect(perft(initialPosition(RULES_STANDARD_CHESS), depth)).toBe(nodes)
  }, 120_000)

  it(`the control ruleset is ${TOKEN_STANDARD_CHESS} and emits no portal move`, () => {
    const s = initialPosition(RULES_STANDARD_CHESS)

    expect(allLegalMoves(s, 'white').filter(m => m.crossedSeam)).toEqual([])
  })
})

/**
 * The standard perft position suite.
 *
 * These four positions exist because the starting position, walked to a shallow depth,
 * exercises almost nothing interesting: no castling, no promotion, no pinned en passant.
 * Each of these was designed to break a specific class of generator bug, and between them
 * they cover every rule this project has. They are the reason spec §13 could be trusted
 * the day it was written rather than the month after.
 *
 * All are run under `------` — every portal flag off — where Mirror Chess *is* chess and
 * the answers are published. Getting a variant right is a matter of opinion until the
 * variant can be configured back into a game that isn't.
 */
describe('perft: the standard position suite (ordinary chess)', () => {
  const SUITE: readonly (readonly [name: string, fen: string, counts: readonly number[]])[] = [
    // Kiwipete — the classic. Castling both ways for both sides, pins, and a promotion
    // race. If a generator has one bug, this position usually finds it.
    ['Kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -',
      [48, 2_039, 97_862]],
    // Position 3 — a pawn endgame built around en passant and rank pins.
    ['Position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -',
      [14, 191, 2_812, 43_238, 674_624]],
    // Position 4 — promotions, including under-promotion with check.
    ['Position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -',
      [6, 264, 9_467, 422_333]],
    // Position 5 — a promotion on the next move, and castling rights that must survive.
    ['Position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
      [44, 1_486, 62_379]],
  ]

  for (const [name, fen, counts] of SUITE) {
    for (const [index, expected] of counts.entries()) {
      it(`${name} perft(${index + 1}) = ${expected}`, () => {
        expect(perft(parseFen(fen, RULES_STANDARD_CHESS), index + 1)).toBe(expected)
      }, 60_000)
    }
  }
})

/**
 * The deep counts, which are the strongest evidence available and far too slow to run on
 * every save. **They pass** — Kiwipete depth 4 (4,085,603 nodes) took 37 s and Position 5
 * depth 4 (2,103,487) took 18 s when this suite was written.
 *
 * Run them with `PERFT_DEEP=1 npm run test`. Do that after any change to move generation,
 * `applyMoveToBoard`, or the castling and en-passant bookkeeping — that is exactly the
 * code whose bugs hide below depth 4.
 */
describe.skipIf(!process.env.PERFT_DEEP)('perft: deep published counts', () => {
  const DEEP = [
    { name: 'Kiwipete', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', depth: 4, nodes: 4_085_603 },
    { name: 'Position 4', fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -', depth: 4, nodes: 422_333 },
    { name: 'Position 5', fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', depth: 4, nodes: 2_103_487 },
  ] as const

  it.each(DEEP)('$name perft($depth) = $nodes', ({ fen, depth, nodes }) => {
    expect(perft(parseFen(fen, RULES_STANDARD_CHESS), depth)).toBe(nodes)
  }, 600_000)
})

describe('perft: the mirror variants', () => {
  /**
   * No external authority exists for these — nobody else has ever counted them — so
   * they are **regression baselines**, pinned the day the generator was verified
   * against published chess above. A change here means move generation changed;
   * if that was not intended, it is a bug.
   *
   * **Re-baselined 2026-10-03** for the revised crossing (spec §4: the ray continues, so
   * a diagonal keeps its colour). Deliberately regenerated and recorded, never adjusted
   * to match — the published chess counts above are the only externally verified numbers
   * here, and they did **not** move, which is what makes a re-baseline safe to accept.
   *
   * | ruleset | before (rank-preserving hop) | after (the ray continues) |
   * | --- | --- | --- |
   * | sliders only | 20, 400, 9 690, 230 114 | 20, 392, 9 000, 203 214 |
   * | all on | 20, 400, 9 852, 238 060 | 20, 392, 9 162, 211 036 |
   *
   * Depth 2 falls **below chess's 400**, which looks wrong and is not. Four White pawn
   * moves open a wrapped diagonal that pins a Black pawn to its king: after `1.c3` the
   * queen on `d1` runs `c2, b3, a4 | h5, g6, f7`, so `f7` cannot move; after `1.g3` the
   * bishop on `f1` runs `g2, h3 | a4, b5, c6, d7`, so `d7` cannot move. Four moves × two
   * lost replies = the eight. The seam does not only *add* moves — through a pin it takes
   * them away, on move two, in a way chess cannot. Measured, not reasoned:
   * `diagonal-crossing.md` §6 (M2).
   */
  const BASELINES: readonly (readonly [token: string, depths: readonly number[]])[] = [
    [TOKEN_SLIDERS_ONLY, [20, 392, 9_000, 203_214]],
    [TOKEN_ALL_ON, [20, 392, 9_162, 211_036]],
  ]

  const RULES_BY_TOKEN = {
    [TOKEN_SLIDERS_ONLY]: RULES_SLIDERS_ONLY,
    [TOKEN_ALL_ON]: RULES_ALL_ON,
  } as const

  it.each(BASELINES)('%s', (token, expected) => {
    const rules = RULES_BY_TOKEN[token as keyof typeof RULES_BY_TOKEN]
    const actual = expected.map((_, i) => perft(initialPosition(rules), i + 1))

    expect(actual).toEqual([...expected])
  })

  it('the seam widens the tree, and widens it more as more pieces cross', () => {
    const standard = perft(initialPosition(RULES_STANDARD_CHESS), 4)
    const sliders = perft(initialPosition(RULES_SLIDERS_ONLY), 4)
    const all = perft(initialPosition(RULES_ALL_ON), 4)

    expect(standard).toBeLessThan(sliders)
    expect(sliders).toBeLessThan(all)
  }, 60_000)

  it('the seam pins a pawn to its king on move two, which is where the 8 missing replies went', () => {
    // The behavioural form of the depth-2 re-baseline above. A perft count would catch a
    // regression here; it would not tell anyone what broke, and this is too good a
    // property of the variant to leave encoded only as the number 392.
    for (const [opening, pinner, pinned] of [
      ['c2', 'c3', 'f7'], // queen d1: c2, b3, a4 | h5, g6, f7
      ['g2', 'g3', 'd7'], // bishop f1: g2, h3 | a4, b5, c6, d7
    ] as const) {
      const s = initialPosition(RULES_SLIDERS_ONLY)
      const push = allLegalMoves(s, 'white')
        .find(m => algebraic(m.from) === opening && algebraic(m.to) === pinner)

      expect(push, `${opening}${pinner} should be legal`).toBeDefined()
      const after = reduceMove(s, push!)

      expect(isInCheck(after, 'black')).toBe(false) // a pin, not a check
      expect(legalMovesFor(after, parseAlgebraic(pinned))).toEqual([])
      // …and with the seam closed the same pawn moves freely, so this is the seam's doing.
      const chess = initialPosition(RULES_STANDARD_CHESS)
      const chessAfter = reduceMove(chess, allLegalMoves(chess, 'white')
        .find(m => algebraic(m.from) === opening && algebraic(m.to) === pinner)!)

      expect(legalMovesFor(chessAfter, parseAlgebraic(pinned))).toHaveLength(2)
    }
  })

  it('the opening position offers no portal move under any ruleset', () => {
    // Every wrapped destination is occupied by an own pawn, or is an empty square a
    // pawn may not move to — so the seam is invisible until the position opens up.
    for (const rules of [RULES_STANDARD_CHESS, RULES_SLIDERS_ONLY, RULES_ALL_ON]) {
      const s = initialPosition(rules)
      expect(allLegalMoves(s, 'white').filter(m => m.crossedSeam)).toEqual([])
    }
  })
})

describe('perftDivide', () => {
  it('subtotals sum to the total, which is what makes it a bisection tool', () => {
    const s = initialPosition(RULES_ALL_ON)
    const divided = perftDivide(s, 3)
    const sum = [...divided.values()].reduce((a, b) => a + b, 0)

    expect(sum).toBe(perft(s, 3))
    expect(divided.size).toBe(perft(s, 1))
  })

  it('marks a portal move so it is distinguishable in the breakdown', () => {
    const s = fromPiecesSpec('w:Bb3; b:Kd8', 'white', RULES_ALL_ON)
    const keys = [...perftDivide(s, 1).keys()]

    expect(keys).toContain('b3h5*') // through the seam (spec §5.1, revised 2026-10-03)
    expect(keys).toContain('b3c4') // an ordinary diagonal step
  })

  it('moveKey renders origin, destination and the seam marker', () => {
    const s = fromPiecesSpec('w:Bb3', 'white', RULES_ALL_ON)
    const moves = allLegalMoves(s, 'white')
    const portal = moves.find(m => m.crossedSeam)
    const ordinary = moves.find(m => !m.crossedSeam)

    expect(moveKey(portal!)).toMatch(/^b3[a-h][1-8]\*$/)
    expect(moveKey(ordinary!)).toMatch(/^b3[a-h][1-8]$/)
  })
})
