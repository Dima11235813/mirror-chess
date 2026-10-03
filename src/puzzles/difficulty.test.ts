import { describe, it, expect } from 'vitest'
import { fromPiecesSpec } from '../game/setup'
import { allLegalMoves } from '../game/status'
import { algebraic } from '../game/coord'
import { RULES_ALL_ON } from '../game/rules'
import { bandOf, measureDifficulty } from './difficulty'
import type { GameState, Move } from '../game/types'
import type { DifficultyFeatures } from './difficulty'

const at = (spec: string): GameState => fromPiecesSpec(spec, 'white', RULES_ALL_ON)

const moveIn = (state: GameState, from: string, to: string): Move =>
  allLegalMoves(state, 'white').find(m => algebraic(m.from) === from && algebraic(m.to) === to)!

/** A features object to vary one field of, for the band tests. */
const baseFeatures: DifficultyFeatures = {
  keyMoveQuiet: false,
  forcingMoves: 1,
  defences: 1,
  travel: 1,
  goalMoves: 2,
  crossedSeam: false,
  score: 0,
}

describe('measuring the features', () => {
  it('calls a check what it is, and a quiet move what it is', () => {
    // Bc3xg7 takes a knight and checks the king behind it; Bc3-d4 does neither, because
    // that same knight blocks the diagonal. Fixture replaced 2026-10-03: the old one used
    // Bf8-c4, a move between squares of *different* colours, which only existed while a
    // crossing flipped square colour (spec §7).
    const state = at('w:Ke1,Bc3; b:Kh8,Ng7,Ph6')

    expect(measureDifficulty(state, moveIn(state, 'c3', 'g7'), 2).keyMoveQuiet).toBe(false)
    // Bc3-b4 is the quiet one. Not Bc3-d4, which looks quiet and is not: d4's north-west
    // ray runs c5, b6, a7 and wraps onto h8, so it checks the king from behind. A worked
    // example of why these fixtures get verified against the engine rather than eyeballed.
    expect(measureDifficulty(state, moveIn(state, 'c3', 'b4'), 2).keyMoveQuiet).toBe(true)
  })

  it('counts the forcing moves a player would look at first', () => {
    // A position with a queen has many checks to reject; a bare position has few.
    const busy = at('w:Ke1,Qd4; b:Kh8,Ph7')
    const quiet = at('w:Ke1,Bc1; b:Kh8,Ph7')

    expect(measureDifficulty(busy, moveIn(busy, 'd4', 'd5'), 2).forcingMoves)
      .toBeGreaterThan(measureDifficulty(quiet, moveIn(quiet, 'c1', 'd2'), 2).forcingMoves)
  })

  it('counts the defences the move leaves, which is what makes a two-mover real', () => {
    // Two positions, verified against the engine: Be5-g7 leaves seven replies, while
    // Qa8-a1 leaves none at all — it is mate on the spot (`search.test.ts` searches that
    // same position). A move that ends the game is not a mate-in-2 key move, and the count
    // is how the miner and the band can tell.
    //
    // Both numbers moved on 2026-10-03: the reply count because the seam no longer offers
    // the black king colour-flipped escapes, and the mate because the old fixture's mating
    // move no longer exists.
    const withReplies = at('w:Kc7,Bf7,Be5; b:Ka7,Ng1')
    const mateAtOnce = at('w:Kf3,Qa8; b:Kg1')

    expect(measureDifficulty(withReplies, moveIn(withReplies, 'e5', 'g7'), 2).defences).toBe(7)
    expect(measureDifficulty(mateAtOnce, moveIn(mateAtOnce, 'a8', 'a1'), 2).defences).toBe(0)
  })

  it('measures how far the piece travelled', () => {
    const state = at('w:Ke1,Bc1; b:Kh8,Ph7')

    expect(measureDifficulty(state, moveIn(state, 'c1', 'd2'), 2).travel).toBe(1)
    expect(measureDifficulty(state, moveIn(state, 'c1', 'h6'), 2).travel).toBe(5)
  })

  it('records whether the move crossed the seam', () => {
    const state = at('w:Ke1,Bc1; b:Kh8,Ph7')

    // c1 crosses to h4 via b2, a3 (spec §5.2). It used to cross to h3, a square of the
    // opposite colour, which is exactly the bug the 2026-10-03 revision fixed.
    expect(measureDifficulty(state, moveIn(state, 'c1', 'h4'), 2).crossedSeam).toBe(true)
    expect(measureDifficulty(state, moveIn(state, 'c1', 'd2'), 2).crossedSeam).toBe(false)
  })
})

describe('the band', () => {
  it('is monotone: adding a hard feature never makes a puzzle easier', () => {
    // The only claim an uncalibrated score can honestly make is that it *orders* puzzles.
    // If adding difficulty could lower the band, even that claim would be false.
    const order = { easy: 0, medium: 1, hard: 2 } as const
    const base = { ...baseFeatures, score: 0 }

    const quieter = { ...base, keyMoveQuiet: true, score: 3 }
    const deeper = { ...base, goalMoves: 3, score: 3 }
    const busier = { ...base, forcingMoves: 16, score: 3 }

    for (const harder of [quieter, deeper, busier]) {
      expect(order[bandOf(harder)]).toBeGreaterThanOrEqual(order[bandOf(base)])
    }
  })

  it('puts a mate in 3 with a quiet key move at the top', () => {
    const hard = { ...baseFeatures, keyMoveQuiet: true, goalMoves: 3, forcingMoves: 20, defences: 4, score: 12 }

    expect(bandOf(hard)).toBe('hard')
  })

  it('puts a one-defence forcing mate in 2 at the bottom', () => {
    // 107 of the first 161 mined puzzles were exactly this shape: a check, one legal
    // reply, mate. Keeping them is fine; calling them hard would not be.
    const easy = { ...baseFeatures, keyMoveQuiet: false, forcingMoves: 1, defences: 1, score: 0 }

    expect(bandOf(easy)).toBe('easy')
  })

  it('ignores the seam entirely', () => {
    // Seam crossing measures unfamiliarity, which decays as a player learns the variant —
    // unlike a quiet key move, which stays hard. Folding a decaying signal into a fixed
    // score gives a number that silently stops being true (research §5).
    for (const score of [0, 3, 6, 9, 12]) {
      const plain = { ...baseFeatures, score, crossedSeam: false }
      const seam = { ...baseFeatures, score, crossedSeam: true }

      expect(bandOf(seam)).toBe(bandOf(plain))
    }
  })
})
