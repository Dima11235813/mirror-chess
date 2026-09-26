import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from '../game/setup'
import { reduceMove } from '../game/reducer'
import { allLegalMoves, gameStatus } from '../game/status'
import { algebraic } from '../game/coord'
import { RULES_ALL_ON, RULES_STANDARD_CHESS, ruleSetOf } from '../game/rules'
import { hasMateInOne, mateInTwoMoves, uniqueMateInTwo } from './mate'
import { search } from '../engine/search'
import { movesToMate, type Depth } from '../engine/types'
import type { GameState } from '../game/types'
import type { RuleSet } from '../game/rules'

const at = (spec: string, rules: RuleSet = RULES_STANDARD_CHESS): GameState =>
  fromPiecesSpec(spec, 'white', rules)

/** Solutions as `"c6c7"`, sorted, for readable expectations. */
const solutions = (state: GameState): string[] =>
  mateInTwoMoves(state).map(m => `${algebraic(m.from)}${algebraic(m.to)}`).sort()

/** Every fixture below was verified against the solver before being written down. */

describe('mate in one', () => {
  it('finds a back-rank mate', () => {
    expect(hasMateInOne(at('w:Ke1,Ra1; b:Kh8,Pg7,Ph7'))).toBe(true)
  })

  it('does not mistake a check for a mate', () => {
    expect(hasMateInOne(at('w:Ke1,Ra1; b:Ke8'))).toBe(false)
  })
})

describe('mate in two', () => {
  it('finds the one move that forces it', () => {
    // King to c7 takes the escape squares; any rook check then mates.
    expect(solutions(at('w:Kc6,Rb1; b:Ka8'))).toEqual(['c6c7'])
  })

  it('does not count a move that mates immediately — that is a different puzzle', () => {
    // Ra8 is mate at once, so it must not appear as a mate *in two*.
    const state = at('w:Ke1,Ra1; b:Kh8,Pg7,Ph7')

    expect(hasMateInOne(state)).toBe(true)
    expect(solutions(state)).toEqual([])
  })

  it('does not count a move that stalemates — nothing is forced if the opponent cannot move', () => {
    // Qg6 leaves the black king with no move and no check: a draw, not a mate.
    expect(solutions(at('w:Kf6,Qg5; b:Kh8'))).not.toContain('g5g6')
  })

  it('every solution it reports really forces mate, replayed through the rules', () => {
    // The claim a puzzle makes, checked rather than trusted: after the solution, whatever
    // the opponent plays, a mate is available. A puzzle whose answer cannot be played is
    // worse than no puzzle.
    const state = at('w:Kc6,Rb1; b:Ka8')

    for (const first of mateInTwoMoves(state)) {
      const afterFirst = reduceMove(state, first)
      expect(afterFirst).not.toBe(state)

      const replies = allLegalMoves(afterFirst, afterFirst.turn)
      expect(replies.length).toBeGreaterThan(0)

      for (const reply of replies) {
        const afterReply = reduceMove(afterFirst, reply)
        if (afterReply === afterFirst) continue
        expect(hasMateInOne(afterReply)).toBe(true)
      }
    }
  })
})

describe('uniqueness', () => {
  it('returns the move when exactly one forces mate', () => {
    const only = uniqueMateInTwo(at('w:Kc6,Rb1; b:Ka8'))

    expect(only).not.toBeNull()
    expect(`${algebraic(only!.from)}${algebraic(only!.to)}`).toBe('c6c7')
  })

  it('returns nothing when several do, because such a position is not a usable puzzle', () => {
    // From c7 the rook mates along ten different squares. A puzzle UI would reject nine
    // correct answers, so the miner must throw this away.
    const state = at('w:Kc7,Rb1; b:Ka8')

    expect(mateInTwoMoves(state).length).toBeGreaterThan(1)
    expect(uniqueMateInTwo(state)).toBeNull()
  })
})

describe('the seam changes which mates exist at all', () => {
  it('a lone bishop mates — and the same position is a dead draw in chess', () => {
    // The draw-rules finding as a puzzle: K+B is mating material here
    // (`prj-mgmt/epics/rules/draw-rules.md`). This is the marquee shape, so it is pinned.
    const spec = 'w:Ka1,Bd4; b:Kh8'

    expect(hasMateInOne(at(spec, RULES_ALL_ON))).toBe(true)
    expect(gameStatus(at(spec, RULES_STANDARD_CHESS))).toBe('draw-insufficient-material')
    expect(hasMateInOne(at(spec, RULES_STANDARD_CHESS))).toBe(false)
  })

  it('...and it is the bishop\'s own flag that does it, not some other piece\'s', () => {
    // Attack follows capture (§12.2): a bishop that cannot capture across cannot mate
    // across. Switching the rook and queen on instead changes nothing.
    const spec = 'w:Ka1,Bd4; b:Kh8'

    expect(hasMateInOne(at(spec, ruleSetOf(['B'])))).toBe(true)
    expect(hasMateInOne(at(spec, ruleSetOf(['R', 'Q'])))).toBe(false)
  })

  it('a mate in two whose solution crosses the seam, and which chess cannot produce', () => {
    // Mined 2026-09-25 and pinned: the kind of puzzle the whole exercise is for.
    const spec = 'w:Ke6,Bd1,Bg8; b:Kf1,Nh8'
    const mirror = at(spec, RULES_ALL_ON)
    const only = uniqueMateInTwo(mirror)

    expect(only).not.toBeNull()
    expect(`${algebraic(only!.from)}${algebraic(only!.to)}`).toBe('g8c5')
    expect(only!.crossedSeam).toBe(true)
    // No faster mate, or the player's quicker answer would be marked wrong.
    expect(hasMateInOne(mirror)).toBe(false)

    // The differential gate: no forced mate at all once the seam closes.
    expect(solutions(at(spec, RULES_STANDARD_CHESS))).toEqual([])
  })
})

describe('what this solver does NOT decide', () => {
  it('a position can have a unique mate in two AND a mate in one — the caller must reject it', () => {
    // Found the hard way on 2026-09-25: the first mined fixture had a unique mate in two
    // *and* an immediate mate, so its "only answer" was not the best answer. The solver is
    // right — it answers exactly what it was asked — but a puzzle needs the extra filter,
    // and the engine's disagreement is what exposed it. Roughly a third of otherwise
    // usable candidates are removed by this.
    const state = at('w:Ke4,Bc3,Be2; b:Ke1,Nc8', RULES_ALL_ON)

    expect(uniqueMateInTwo(state)).not.toBeNull()
    expect(hasMateInOne(state)).toBe(true)
  })
})

describe('the engine agrees with the solver', () => {
  it('a mate in two the solver proves is the mate the search picks', () => {
    // Two implementations, one oracle (ADR 0002), applied to puzzles. The solver is the
    // slow, obvious reference built only on the rules layer; the search is the clever one.
    // It is the search on trial here, which is why puzzles are mined with the solver.
    const state = at('w:Kc6,Rb1; b:Ka8')
    const found = search(state, { maxDepth: 3 as Depth })

    expect(movesToMate(found.score)).toBe(2)
    expect(`${algebraic(found.move!.from)}${algebraic(found.move!.to)}`).toBe('c6c7')
  })

  it('and agrees on a seam mate, where it has no chess intuition to fall back on', () => {
    const state = at('w:Ke6,Bd1,Bg8; b:Kf1,Nh8', RULES_ALL_ON)
    const found = search(state, { maxDepth: 3 as Depth })

    expect(movesToMate(found.score)).toBe(2)
    expect(`${algebraic(found.move!.from)}${algebraic(found.move!.to)}`).toBe('g8c5')
  })
})
