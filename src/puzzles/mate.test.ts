import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from '../game/setup'
import { reduceMove } from '../game/reducer'
import { allLegalMoves, gameStatus } from '../game/status'
import { isInCheck } from '../game/attacks'
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
  it('a queen mates by covering a flight square through the seam', () => {
    // Qa8–a1 is mate: the check arrives along an ordinary rank, and the seam takes away
    // h2, the one flight square the white king does not cover — the queen's north-west
    // diagonal wraps onto it. In chess there is no mate here at all.
    //
    // Replaced 2026-10-03. This test used to pin the marquee shape of the old crossing,
    // `Ka1, Bd4 vs Kh8`, where a lone bishop mated because a crossing flipped its square
    // colour. The revised crossing is colour-preserving, so that mate no longer exists and
    // K+B is dead material again (`draw-rules.ts`). The *kind* of claim is unchanged: a
    // mate the seam creates, pinned so a silent geometry change cannot pass.
    const spec = 'w:Kf3,Qa8; b:Kg1'

    expect(hasMateInOne(at(spec, RULES_ALL_ON))).toBe(true)
    expect(gameStatus(at(spec, RULES_STANDARD_CHESS))).toBe('playing')
    expect(hasMateInOne(at(spec, RULES_STANDARD_CHESS))).toBe(false)
  })

  it('...and it is the queen\'s own flag that does it, not some other piece\'s', () => {
    // Attack follows capture (§12.2). Enumerated over all six single-flag rulesets: only
    // Q gives the mate. The king's own crossing right does not help it defend h2, and no
    // other piece is on the board.
    const spec = 'w:Kf3,Qa8; b:Kg1'

    expect(hasMateInOne(at(spec, ruleSetOf(['Q'])))).toBe(true)
    for (const flag of ['B', 'R', 'N', 'K', 'P'] as const) {
      expect(hasMateInOne(at(spec, ruleSetOf([flag]))), `only ${flag}`).toBe(false)
    }
  })

  it('a mate in two whose solution crosses the seam, and which chess cannot produce', () => {
    // Found 2026-10-03 under the revised crossing, and a better example than the one it
    // replaces: the key move is the **king** stepping through the seam, `Ka4–h3`, which
    // takes away the flight squares the queen does not cover. A puzzle whose answer is a
    // king walking off one edge of the board and onto the other is exactly the kind of
    // thing this library exists to contain.
    const spec = 'w:Ka4,Qc5; b:Kh1'
    const mirror = at(spec, RULES_ALL_ON)
    const only = uniqueMateInTwo(mirror)

    expect(only).not.toBeNull()
    expect(`${algebraic(only!.from)}${algebraic(only!.to)}`).toBe('a4h3')
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
    // Fixture replaced 2026-10-03 (the old one lost its mate with the crossing) and
    // found the same way: by search, then checked for legality — the first two candidates
    // the search produced had Black already in check, which is not a position.
    const state = at('w:Kc1,Rg7,Rf3; b:Ke1', RULES_ALL_ON)

    expect(isInCheck(state, 'black')).toBe(false)
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
    const state = at('w:Ka4,Qc5; b:Kh1', RULES_ALL_ON)
    const found = search(state, { maxDepth: 3 as Depth })

    expect(movesToMate(found.score)).toBe(2)
    expect(`${algebraic(found.move!.from)}${algebraic(found.move!.to)}`).toBe('a4h3')
  })
})
