import { describe, it, expect } from 'vitest'
import type { GameState, Move } from '@game/types'
import { fromPiecesSpec, initialPosition } from '@game/setup'
import { parseFen } from '@game/fen'
import { reduceMove } from '@game/reducer'
import { isInCheck } from '@game/attacks'
import { allLegalMoves } from '@game/status'
import { moveKey } from '@game/perft'
import { sameCoord } from '@game/coord'
import { RULES_ALL_ON, RULES_SLIDERS_ONLY, RULES_STANDARD_CHESS } from '@game/rules'
import { search, searchUnpruned } from './search'
import { evaluate, evaluateVerbose, materialFor } from './eval'
import { MATE_SCORE, cp, depth, isMateScore, movesToMate } from './types'

/**
 * The engine's correctness properties.
 *
 * The one that matters most is **alpha-beta ≡ negamax**. Pruning is an optimisation, and
 * an optimisation that changes the answer is a bug that no amount of playing strength
 * hides — the engine simply plays a different game from the one it is meant to. Everything
 * else here guards a specific trap named in `prj-mgmt/epics/engine/engine-core.md`.
 */

const d = (n: number) => depth(n)

describe('alpha-beta is exactly negamax, only faster', () => {
  // Depth is per-position, because the unpruned searcher is exponential and Kiwipete is
  // a dense middlegame — depth 3 there is minutes of work to prove what depth 2 proves.
  const POSITIONS: readonly (readonly [name: string, state: GameState, depth: number])[] = [
    ['opening, ordinary chess', initialPosition(RULES_STANDARD_CHESS), 3],
    ['opening, sliders cross', initialPosition(RULES_SLIDERS_ONLY), 3],
    ['opening, everything crosses', initialPosition(RULES_ALL_ON), 3],
    ['a tactical middlegame', parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', RULES_STANDARD_CHESS), 2],
    ['an endgame where the seam matters', fromPiecesSpec('w:Ka1,Bd4,Pb2; b:Kh8,Ra8', 'white', RULES_ALL_ON), 3],
  ]

  /*
   * Quiescence is off for every comparison in this block, and that is not a workaround.
   * Alpha-beta, move ordering and iterative deepening are **value-preserving**: they skip
   * or reorder work whose result is provably irrelevant, so the score must be identical to
   * plain negamax. Quiescence is the one technique on the v1 list that changes the answer
   * *on purpose* — it exists to return a better score than the fixed-depth one
   * (`engine-core.md` §3a). Comparing with it on would be testing that two different
   * questions have the same answer.
   */
  const EXACT = { quiescence: false } as const

  it.each(POSITIONS)('%s: same score and same move', (_name, state, plies) => {
    const pruned = search(state, { ...EXACT, maxDepth: d(plies) })
    const exhaustive = searchUnpruned(state, { ...EXACT, maxDepth: d(plies) })

    expect(pruned.score).toBe(exhaustive.score)
    expect(pruned.move && moveKey(pruned.move)).toBe(exhaustive.move && moveKey(exhaustive.move))
  }, 180_000)

  it('holds with move ordering switched off too', () => {
    // Ordering changes which move is *found* first, so it could in principle change which
    // of several equally-scoring moves is chosen. Checking both configurations pins that
    // the score never moves, whichever order the loop runs in.
    const state = initialPosition(RULES_ALL_ON)
    const unordered = { ...EXACT, ordering: false, maxDepth: d(3) }

    expect(search(state, unordered).score).toBe(searchUnpruned(state, unordered).score)
  }, 180_000)

  it('and ordering does not change the score, only the cost', () => {
    const state = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', RULES_STANDARD_CHESS)

    const ordered = search(state, { ...EXACT, maxDepth: d(3), ordering: true })
    const unordered = search(state, { ...EXACT, maxDepth: d(3), ordering: false })

    expect(ordered.score).toBe(unordered.score)
    // ...and it is worth having: ordering should cut the tree substantially.
    expect(ordered.nodes).toBeLessThan(unordered.nodes)
  }, 180_000)

  it('and visits far fewer nodes than no pruning at all, which is the entire point', () => {
    const state = initialPosition(RULES_STANDARD_CHESS)

    const pruned = search(state, { ...EXACT, maxDepth: d(3) })
    const exhaustive = searchUnpruned(state, { ...EXACT, maxDepth: d(3) })

    expect(pruned.nodes).toBeLessThan(exhaustive.nodes)
  }, 120_000)
})

describe('quiescence — the cure for the horizon effect', () => {
  it('sees the recapture a fixed-depth search stops just short of', () => {
    // White to move at depth 1. Rxd5 looks like winning a knight; the pawn on e6 recaptures
    // immediately. A depth-1 search without quiescence cannot see it — that is the horizon
    // effect, and it is exactly the blunder that makes a naive engine unplayable.
    const s = fromPiecesSpec('w:Ke1,Rd1; b:Ke8,Nd5,Pe6', 'white', RULES_STANDARD_CHESS)

    const blind = search(s, { maxDepth: d(1), quiescence: false })
    const seeing = search(s, { maxDepth: d(1), quiescence: true })

    expect(moveKey(blind.move!)).toBe('d1d5') // grabs the knight and loses the rook
    expect(moveKey(seeing.move!)).not.toBe('d1d5')
  }, 60_000)

  it('does not stand pat while in check — every evasion is considered', () => {
    // The most destructive bug this function can have: declining to move is not an option
    // when the king is attacked. If quiescence stood pat here it would report the static
    // score and never notice the king is lost.
    const s = fromPiecesSpec('w:Kh1,Qa1; b:Ke8,Rh8,Ra8', 'white', RULES_STANDARD_CHESS)
    const result = search(s, { maxDepth: d(1), quiescence: true })

    // White is in check from Rh8 and must deal with it; the score must not be a cheerful
    // material count that ignores the attack.
    expect(isInCheck(s, 'white')).toBe(true)
    expect(result.move).not.toBeNull()

    const replayed = reduceMove(s, result.move!)
    expect(replayed).not.toBe(s)
    // Whatever it played, White's king is safe. (`replayed.inCheck` would be the wrong
    // thing to assert — that field describes whoever is to move *now*, which is Black.)
    expect(isInCheck(replayed, 'white')).toBe(false)
  }, 60_000)

  it('reports how much of the search was quiescence, since the seam can blow it up', () => {
    const s = parseFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -', RULES_ALL_ON)
    const result = search(s, { maxDepth: d(2), quiescence: true })

    expect(result.quiescenceNodes).toBeGreaterThan(0)
    expect(result.quiescenceNodes).toBeLessThanOrEqual(result.nodes)
  }, 60_000)
})

describe('iterative deepening', () => {
  it('reports every completed iteration, deepest last', () => {
    const seen: number[] = []
    const result = search(initialPosition(RULES_STANDARD_CHESS), {
      maxDepth: d(3),
      onIteration: iteration => seen.push(iteration.depth),
    })

    expect(seen).toEqual([1, 2, 3])
    expect(result.depth).toBe(3)
  }, 120_000)

  it('returns the last COMPLETED iteration when interrupted, never a half-searched one', () => {
    // A part-searched iteration's "best" move is an artefact of where it stopped, so it
    // must be discarded rather than returned.
    let calls = 0
    const result = search(initialPosition(RULES_ALL_ON), {
      maxDepth: d(6),
      // Abort once the search is well underway, mid-iteration.
      shouldStop: () => ++calls > 2,
    })

    expect(result.move).not.toBeNull()
    expect(result.depth).toBeLessThan(6)
  }, 120_000)

  it('is still deterministic when nothing interrupts it', () => {
    const state = initialPosition(RULES_ALL_ON)
    const a = search(state, { maxDepth: d(3) })
    const b = search(state, { maxDepth: d(3) })

    expect(a.nodes).toBe(b.nodes)
    expect(a.score).toBe(b.score)
    expect(moveKey(a.move!)).toBe(moveKey(b.move!))
  }, 120_000)
})

describe('finding mate', () => {
  it('finds mate in one', () => {
    // Rb8# — the black king on h8 is boxed in by its own pawns, and the rook covers the
    // whole eighth rank. Nothing can capture or interpose.
    const s = fromPiecesSpec('w:Ka1,Ra7,Rb7; b:Kh8,Pg7,Ph7', 'white', RULES_STANDARD_CHESS)
    const result = search(s, { maxDepth: d(2) })

    expect(isMateScore(result.score)).toBe(true)
    expect(movesToMate(result.score)).toBe(1)
  }, 60_000)

  it('prefers mate to winning a rook', () => {
    // White may take the rook with Rxd5, or mate with Rb8#. Black's rook cannot interpose
    // on the eighth rank because White's own pawn on d7 blocks the d-file — so the mate is
    // real, and a material-driven engine that grabs the rook instead has failed.
    const s = fromPiecesSpec('w:Ka1,Rb7,Rd1,Pd7; b:Kh8,Pg7,Ph7,Rd5', 'white', RULES_STANDARD_CHESS)
    const result = search(s, { maxDepth: d(2) })

    expect(isMateScore(result.score)).toBe(true)
    expect(movesToMate(result.score)).toBe(1)
  }, 60_000)

  it('scores a mate by distance, so a faster mate scores higher', () => {
    const s = fromPiecesSpec('w:Ka1,Ra7,Rb7; b:Kh8,Pg7,Ph7', 'white', RULES_STANDARD_CHESS)
    const result = search(s, { maxDepth: d(3) })

    expect(result.score).toBe(cp(MATE_SCORE - 1))
  }, 60_000)

  it('finds a mate that exists ONLY because of the seam', () => {
    // `Qa8–a1` is mate because the queen's north-west diagonal wraps the seam onto h2,
    // the one flight square the white king does not cover. The check itself arrives along
    // an ordinary rank; it is the *flight square* the seam takes away, which is why a
    // chess engine would not see it. Enumerated: this is the only mate in the position
    // under the mirror rules, and in chess there is none at all.
    //
    // Replaced 2026-10-03. The old fixture was `Ka1, Bc3` vs `Kh8` — king and bishop
    // mating alone — which the revised crossing abolished (`draw-rules.ts`).
    const s = fromPiecesSpec('w:Kf3,Qa8; b:Kg1', 'white', RULES_ALL_ON)
    const result = search(s, { maxDepth: d(2) })

    expect(isMateScore(result.score)).toBe(true)
    expect(result.move && moveKey(result.move)).toBe('a8a1')

    // ...and with the seam closed, the same position has no mate for the engine to find.
    const chess = fromPiecesSpec('w:Kf3,Qa8; b:Kg1', 'white', RULES_STANDARD_CHESS)
    expect(isMateScore(search(chess, { maxDepth: d(2) }).score)).toBe(false)
  }, 60_000)

  it('...and does not find it once the bishop cannot cross', () => {
    const s = fromPiecesSpec('w:Ka1,Bc3; b:Kh8', 'white', RULES_STANDARD_CHESS)

    expect(isMateScore(search(s, { maxDepth: d(2) }).score)).toBe(false)
  }, 60_000)
})

describe('the principal variation', () => {
  it('is legal from the root — every move replays through the reducer', () => {
    const start = initialPosition(RULES_ALL_ON)
    const { pv } = search(start, { maxDepth: d(3) })

    expect(pv.length).toBeGreaterThan(0)
    let state = start
    for (const move of pv) {
      const next = reduceMove(state, move)
      expect(next, `illegal PV move ${moveKey(move)}`).not.toBe(state)
      state = next
    }
  }, 120_000)

  it('starts with the move the search says it chose', () => {
    const result = search(initialPosition(RULES_STANDARD_CHESS), { maxDepth: d(2) })

    expect(result.pv[0] && result.move && sameCoord(result.pv[0].to, result.move.to)).toBe(true)
  }, 60_000)
})

describe('terminal positions', () => {
  it('returns no move when the game is already over', () => {
    const mated = fromPiecesSpec('w:Ka1,Re8; b:Kg8,Pf7,Pg7,Ph7', 'black', RULES_ALL_ON)
    const result = search(mated, { maxDepth: d(2) })

    expect(result.move).toBeNull()
    expect(isMateScore(result.score)).toBe(true)
  })

  it('scores a stalemate as a draw, not a loss', () => {
    const stalemate = fromPiecesSpec('w:Ka1,Qf6,Rh1; b:Kg8', 'black', RULES_ALL_ON)

    expect(search(stalemate, { maxDepth: d(2) }).score).toBe(0)
  })

  it('does not chase a win in a dead position', () => {
    const dead = fromPiecesSpec('w:Ke1,Nb1; b:Ke8', 'white', RULES_STANDARD_CHESS)

    expect(search(dead, { maxDepth: d(3) }).score).toBe(0)
  }, 60_000)
})

describe('determinism', () => {
  it('the same inputs give the same move and the same node count', () => {
    const state = initialPosition(RULES_ALL_ON)
    const a = search(state, { maxDepth: d(3) })
    const b = search(state, { maxDepth: d(3) })

    expect(a.nodes).toBe(b.nodes)
    expect(a.move && moveKey(a.move)).toBe(b.move && moveKey(b.move))
    expect(a.score).toBe(b.score)
  }, 120_000)
})

describe('it actually plays', () => {
  it('wins a hanging queen', () => {
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Qa5', 'white', RULES_STANDARD_CHESS)
    const result = search(s, { maxDepth: d(2) })

    expect(result.move && moveKey(result.move)).toBe('a1a5')
  }, 60_000)

  it('does not take a defended piece for nothing', () => {
    // Qxd5 loses the queen to the pawn on e6 — visible only at depth 2.
    const s = fromPiecesSpec('w:Ke1,Qd1,Ra1; b:Ke8,Nd5,Pe6', 'white', RULES_STANDARD_CHESS)
    const chosen = search(s, { maxDepth: d(2) }).move

    expect(chosen && moveKey(chosen)).not.toBe('d1d5')
  }, 60_000)

  it('plays a legal move from a real opening position under every ruleset', () => {
    for (const rules of [RULES_STANDARD_CHESS, RULES_SLIDERS_ONLY, RULES_ALL_ON]) {
      const state = initialPosition(rules)
      const result = search(state, { maxDepth: d(2) })
      const legal = allLegalMoves(state, state.turn)

      expect(result.move).not.toBeNull()
      expect(legal.some((m: Move) => moveKey(m) === moveKey(result.move!))).toBe(true)
    }
  }, 120_000)
})

describe('evaluation', () => {
  it('is symmetric: the opening is level for whoever is to move', () => {
    const s = initialPosition(RULES_ALL_ON)

    expect(evaluate(s, 'white')).toBe(0)
    expect(evaluate(s, 'black')).toBe(0)
  })

  it('reports a breakdown whose terms sum to the total', () => {
    // The invariant that stops the engine lying to its reader.
    for (const spec of ['w:Ke1,Qd1,Ra1; b:Ke8,Nd5', 'w:Ke1,Pb2,Pc2; b:Ke8,Rh8', 'w:Ke1; b:Ke8']) {
      const s = fromPiecesSpec(spec, 'white', RULES_ALL_ON)
      const breakdown = evaluateVerbose(s, 'white')
      const summed = breakdown.terms.reduce((total, term) => total + term.value, 0)

      expect(summed, spec).toBe(breakdown.total)
    }
  })

  it('the verbose and hot-path forms agree, since they are one formula written twice', () => {
    for (const spec of ['w:Ke1,Qd1; b:Ke8,Ra8', 'w:Ke1,Bc1,Nb1; b:Ke8,Pd7,Pe7']) {
      for (const rules of [RULES_STANDARD_CHESS, RULES_ALL_ON]) {
        for (const options of [{}, { mobility: true }]) {
          const s = fromPiecesSpec(spec, 'white', rules)

          expect(evaluate(s, 'white', options)).toBe(evaluateVerbose(s, 'white', options).total)
          expect(evaluate(s, 'black', options)).toBe(evaluateVerbose(s, 'black', options).total)
        }
      }
    }
  })

  it('leaves mobility out by default, because it costs 1465x what material does', () => {
    // The measurement is in the module doc. This pins the default so the hot path cannot
    // silently acquire a term that would cut the search rate by three orders of magnitude.
    const s = fromPiecesSpec('w:Ke1,Qd1; b:Ke8,Ra8', 'white', RULES_ALL_ON)

    expect(evaluateVerbose(s, 'white').terms.map(t => t.name)).toEqual(['material'])
    expect(evaluateVerbose(s, 'white', { mobility: true }).terms.map(t => t.name))
      .toEqual(['material', 'mobility'])
  })

  it('counts material without counting the king', () => {
    const s = fromPiecesSpec('w:Ke1,Pb2; b:Ke8', 'white', RULES_STANDARD_CHESS)

    expect(materialFor(s, 'white')).toBe(100)
    expect(materialFor(s, 'black')).toBe(0)
  })
})
