import { describe, it, expect } from 'vitest'
import { fromPiecesSpec, initialPosition } from '@game/setup'
import { RULES_ALL_ON, RULES_STANDARD_CHESS } from '@game/rules'
import { rootDiagnostics } from './diagnostics'

/**
 * The gauge for `prj-mgmt/epics/balance/watch-a-game.md`.
 *
 * It measures what the **evaluation** can tell apart, not what the search can. That
 * distinction is the whole point: the search finds tactics the evaluation is blind to, so a
 * count taken from the search would hide exactly the problem this number exists to show.
 */
describe('rootDiagnostics', () => {
  it('finds every opening move indistinguishable, which is the blocker in one number', () => {
    // The measured state of the engine on 2026-10-04: material-only evaluation, so no
    // quiet move is worth more than any other and self-play degenerates into a shuffle.
    // When this test starts failing because the count dropped, the evaluation began to
    // work — that is a good failure, and the reason this is pinned rather than described.
    const d = rootDiagnostics(initialPosition(RULES_ALL_ON))

    expect(d.legalMoves).toBe(20)
    expect(d.indistinguishable).toBe(20)
    expect(d.bestStatic).toBe(0)
  })

  it('separates a capture from the quiet moves around it', () => {
    // The control. Without it the test above would pass against a function that always
    // returns "everything ties", which is not the claim being made.
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Qa8', 'white', RULES_ALL_ON)
    const d = rootDiagnostics(s)

    // Rxa8 wins a queen; nothing else does, so exactly one move stands out.
    expect(d.indistinguishable).toBe(1)
    expect(d.bestStatic).toBeGreaterThan(0)
    expect(d.legalMoves).toBeGreaterThan(1)
  })

  it('counts the ties at the best score, not the ties anywhere', () => {
    // Two different captures of different value, plus quiet moves. Only the best ties.
    const s = fromPiecesSpec('w:Ke1,Ra1,Rh1; b:Ke8,Qa8,Nh8', 'white', RULES_ALL_ON)
    const d = rootDiagnostics(s)

    expect(d.indistinguishable).toBe(1) // Rxa8 (queen) beats Rxh8 (knight)
    expect(d.legalMoves).toBeGreaterThan(2)
  })

  it('reports no legal moves rather than throwing, so a finished game is safe to inspect', () => {
    // Black is mated: the screen asks for diagnostics on every position it shows, including
    // the last one, and a crash on the final position would be a poor way to end a game.
    const mated = fromPiecesSpec('w:Kf3,Qa1; b:Kg1', 'black', RULES_ALL_ON)
    const d = rootDiagnostics(mated)

    expect(d.legalMoves).toBe(0)
    expect(d.indistinguishable).toBe(0)
  })

  it('is a property of the ruleset, because the legal moves are', () => {
    // The same board under two rulesets: the seam adds moves, so the count must move with
    // it. A diagnostic that ignored the ruleset would mislead on exactly the screen it is
    // built for, where the ruleset is the thing under study.
    const spec = 'w:Ke1,Bb3; b:Ke8,Pa7'

    const mirror = rootDiagnostics(fromPiecesSpec(spec, 'white', RULES_ALL_ON))
    const chess = rootDiagnostics(fromPiecesSpec(spec, 'white', RULES_STANDARD_CHESS))

    expect(mirror.legalMoves).toBeGreaterThan(chess.legalMoves)
  })
})
