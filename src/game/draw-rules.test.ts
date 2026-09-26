import { describe, it, expect } from 'vitest'
import type { Color, Coord, Kind, Piece, MovePosition } from './types'
import {
  RULES_ALL_ON,
  RULES_SLIDERS_ONLY,
  RULES_STANDARD_CHESS,
  ruleSetFrom,
  type PortalRights,
  type RuleSet,
} from './rules'
import { fromPiecesSpec } from './setup'
import { NO_CASTLING_RIGHTS, makeMove } from './move'
import { reduceMove } from './reducer'
import { isInCheck } from './attacks'
import { legalMovesFor } from './moves'
import { allLegalMoves } from './status'
import { parseAlgebraic } from './coord'
import {
  FIFTY_MOVE_HALFMOVES,
  isFiftyMoveRule,
  isInsufficientMaterial,
  isThreefoldRepetition,
  repetitionCount,
  drawnBy,
} from './draw-rules'

/**
 * Executable form of `prj-mgmt/epics/rules/draw-rules.md`.
 *
 * The insufficient-material half is not a set of examples but a **proof**: every claim
 * the rule makes is checked by enumerating every placement of that material under every
 * setting of the flags that could affect it, and confirming no checkmate exists. That is
 * the only honest way to make the claim here, because the chess answers do not survive
 * the seam — see "the enumeration" below.
 */

/**
 * A move for the reducer to match.
 *
 * The flag and `crossedSeam` are not supplied because `reduceMove` does not match on
 * them — it matches on destination and promotion piece, and dedupe guarantees at most
 * one move per destination. Whichever real move the generator produced is the one applied.
 */
const move = (from: string, to: string) =>
  makeMove(parseAlgebraic(from), parseAlgebraic(to), 'quiet')

describe('threefold repetition', () => {
  it('counts the current position, so a fresh game has seen it once', () => {
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white')

    expect(repetitionCount(s)).toBe(1)
    expect(isThreefoldRepetition(s)).toBe(false)
  })

  it('declares a draw when knights shuffle back to the same position three times', () => {
    // The classic: both sides walk their knight out and back. Every position in the
    // cycle recurs, and the third occurrence of the start ends the game.
    let s = fromPiecesSpec('w:Ke1,Nb1; b:Ke8,Nb8', 'white')
    const cycle = [
      move('b1', 'c3'), move('b8', 'c6'),
      move('c3', 'b1'), move('c6', 'b8'),
    ]

    for (const m of cycle) s = reduceMove(s, m)
    expect(repetitionCount(s)).toBe(2)
    expect(drawnBy(s)).toBeNull()

    for (const m of cycle) s = reduceMove(s, m)
    expect(repetitionCount(s)).toBe(3)
    expect(drawnBy(s)).toBe('draw-repetition')
  })

  it('does not count a position reached with the other side to move', () => {
    // Side to move is part of a position's identity: white's rook returning to a1 with
    // black to move is not the same position as the start, which had white to move.
    let s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white')
    for (const m of [move('a1', 'a2'), move('h8', 'h7'), move('a2', 'a1')]) s = reduceMove(s, m)

    expect(s.turn).toBe('black')
    expect(repetitionCount(s)).toBe(1)
  })

  it('forgets everything before an irreversible move', () => {
    // A pawn push makes every earlier position unreachable, so the history restarts.
    let s = fromPiecesSpec('w:Ke1,Ra1,Pd2; b:Ke8,Rh8', 'white')
    s = reduceMove(s, move('a1', 'a2'))
    s = reduceMove(s, move('h8', 'h7'))
    expect(s.history).toHaveLength(3)

    s = reduceMove(s, move('d2', 'd3'))
    expect(s.history).toHaveLength(1)
    expect(s.halfmoveClock).toBe(0)
  })

  it('refuses further moves once the game is drawn', () => {
    let s = fromPiecesSpec('w:Ke1,Nb1; b:Ke8,Nb8', 'white')
    const cycle = [
      move('b1', 'c3'), move('b8', 'c6'),
      move('c3', 'b1'), move('c6', 'b8'),
    ]
    for (let i = 0; i < 2; i++) for (const m of cycle) s = reduceMove(s, m)

    expect(drawnBy(s)).toBe('draw-repetition')
    // The position still has legal moves — unlike mate, nothing but this guard stops play.
    expect(allLegalMoves(s, s.turn).length).toBeGreaterThan(0)
    expect(reduceMove(s, move('b1', 'c3'))).toBe(s)
  })
})

describe('the fifty-move rule', () => {
  it('counts a hundred halfmoves — fifty by each side', () => {
    expect(FIFTY_MOVE_HALFMOVES).toBe(100)
  })

  it('increments the clock on a quiet move and resets it on a pawn move', () => {
    let s = fromPiecesSpec('w:Ke1,Ra1,Pd2; b:Ke8,Rh8', 'white')
    expect(s.halfmoveClock).toBe(0)

    s = reduceMove(s, move('a1', 'a2'))
    expect(s.halfmoveClock).toBe(1)
    s = reduceMove(s, move('h8', 'h7'))
    expect(s.halfmoveClock).toBe(2)

    s = reduceMove(s, move('d2', 'd4'))
    expect(s.halfmoveClock).toBe(0)
  })

  it('resets the clock on a capture', () => {
    let s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Ra8', 'white')
    s = reduceMove(s, move('a1', 'a4'))
    s = reduceMove(s, move('a8', 'a5'))
    expect(s.halfmoveClock).toBe(2)

    s = reduceMove(s, move('a4', 'a5'))
    expect(s.halfmoveClock).toBe(0)
  })

  it('resets the clock on a capture made across the seam', () => {
    // Nd4 blocks the rank, so Ra4 cannot reach h4 the ordinary way. It gets there through
    // the portal: a4 is its own mouth and the ray re-enters on h4 (spec §4). A capture is
    // a capture however it arrives — the clock must not care that the seam was involved.
    let s = fromPiecesSpec('w:Ke1,Ra4,Nd4; b:Ke8,Rh4', 'white')
    s = reduceMove(s, move('e1', 'd1'))
    s = reduceMove(s, move('e8', 'd8'))
    expect(s.halfmoveClock).toBe(2)
    expect(s.history).toHaveLength(3)

    s = reduceMove(s, move('a4', 'h4'))
    expect(s.board[parseAlgebraic('h4').r * 8 + parseAlgebraic('h4').f]?.color).toBe('white')
    expect(s.halfmoveClock).toBe(0)
    expect(s.history).toHaveLength(1)
  })

  it('draws once the clock reaches a hundred', () => {
    const s = fromPiecesSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white')

    expect(isFiftyMoveRule({ ...s, halfmoveClock: 99 })).toBe(false)
    expect(isFiftyMoveRule({ ...s, halfmoveClock: 100 })).toBe(true)
    expect(drawnBy({ ...s, halfmoveClock: 100 })).toBe('draw-fifty-move')
  })
})

/* ── insufficient material ─────────────────────────────────────────────────────── */

const ONE_MINOR_RULESETS: readonly (readonly [string, RuleSet])[] = [
  ['all on', RULES_ALL_ON],
  ['sliders only', RULES_SLIDERS_ONLY],
  ['standard chess', RULES_STANDARD_CHESS],
]

describe('insufficient material — the rule', () => {
  it('bare kings are drawn under every ruleset', () => {
    for (const [, rules] of ONE_MINOR_RULESETS) {
      expect(isInsufficientMaterial(fromPiecesSpec('w:Ke1; b:Ke8', 'white', rules))).toBe(true)
    }
  })

  it('a lone knight is drawn under every ruleset, whichever side owns it', () => {
    for (const [, rules] of ONE_MINOR_RULESETS) {
      expect(isInsufficientMaterial(fromPiecesSpec('w:Ke1,Nb1; b:Ke8', 'white', rules))).toBe(true)
      expect(isInsufficientMaterial(fromPiecesSpec('w:Ke1; b:Ke8,Nb8', 'white', rules))).toBe(true)
    }
  })

  it('a lone bishop is drawn in chess but NOT once it can capture through the seam', () => {
    expect(isInsufficientMaterial(fromPiecesSpec('w:Ke1,Bc1; b:Ke8', 'white', RULES_STANDARD_CHESS))).toBe(true)
    expect(isInsufficientMaterial(fromPiecesSpec('w:Ke1,Bc1; b:Ke8', 'white', RULES_ALL_ON))).toBe(false)
    expect(isInsufficientMaterial(fromPiecesSpec('w:Ke1,Bc1; b:Ke8', 'white', RULES_SLIDERS_ONLY))).toBe(false)
  })

  it('same-coloured bishops are drawn in chess but not when a bishop can cross', () => {
    const sameColour = 'w:Ke1,Bc1; b:Ke8,Bf8' // c1 and f8 are both dark
    expect(isInsufficientMaterial(fromPiecesSpec(sameColour, 'white', RULES_STANDARD_CHESS))).toBe(true)
    expect(isInsufficientMaterial(fromPiecesSpec(sameColour, 'white', RULES_ALL_ON))).toBe(false)
  })

  it('opposite-coloured bishops are never insufficient', () => {
    const opposite = 'w:Ke1,Bc1; b:Ke8,Bc8' // c1 dark, c8 light
    for (const [, rules] of ONE_MINOR_RULESETS) {
      expect(isInsufficientMaterial(fromPiecesSpec(opposite, 'white', rules))).toBe(false)
    }
  })

  it('never adjudicates a partial position that is missing a king', () => {
    // These are analysis positions, not games. Calling them drawn would blank the board
    // for every single-piece test fixture in the repo.
    for (const spec of ['w:Na3', 'w:Bb3', 'w:Ka3', 'w:Ke1,Bc1', 'b:Ke8']) {
      expect(isInsufficientMaterial(fromPiecesSpec(spec, 'white', RULES_STANDARD_CHESS)), spec).toBe(false)
    }
  })

  it('anything that can mate in chess is sufficient', () => {
    for (const spec of ['w:Ke1,Ra1; b:Ke8', 'w:Ke1,Qd1; b:Ke8', 'w:Ke1,Pd2; b:Ke8', 'w:Ke1,Nb1,Ng1; b:Ke8']) {
      expect(isInsufficientMaterial(fromPiecesSpec(spec, 'white', RULES_ALL_ON))).toBe(false)
    }
  })

  it('the headline mirror mate: king and bishop alone deliver checkmate', () => {
    // Bd4 checks along d4–h8. Its other diagonal runs c5, b6, a7, steps through the seam
    // onto h7 and continues to g8 — covering both flight squares. This position is why
    // a lone bishop is no longer insufficient material.
    const s = fromPiecesSpec('w:Ka1,Bd4; b:Kh8', 'black', RULES_ALL_ON)

    expect(isInCheck(s, 'black')).toBe(true)
    expect(allLegalMoves(s, 'black')).toHaveLength(0)
    expect(isInsufficientMaterial(s)).toBe(false)
  })
})

/* ── the enumeration: the proof behind the table above ─────────────────────────── */

/**
 * Every setting a single piece's portal can take. Enumerating all four rather than just
 * on/off matters: the lone-bishop answer differs between `quiet` and `capture`, which an
 * on/off sweep would have missed entirely.
 */
const MODES: readonly (readonly [string, PortalRights])[] = [
  ['off', { quiet: false, capture: false }],
  ['quiet', { quiet: true, capture: false }],
  ['capture', { quiet: false, capture: true }],
  ['full', { quiet: true, capture: true }],
]

/**
 * A bare analysis position: no castling rights and no en-passant square.
 *
 * Both are correct for an enumeration over placements 2014 there is no game behind these
 * boards, so neither right can have been earned.
 */
function analysisPosition(board: readonly (Piece | null)[], rules: RuleSet): MovePosition {
  return { board, rules, castling: NO_CASTLING_RIGHTS, enPassant: null }
}

const coordOf = (square: number): Coord => ({ f: square % 8, r: Math.floor(square / 8) })
const parityOf = (square: number): number => ((square % 8) + Math.floor(square / 8)) % 2
const otherColor = (c: Color): Color => (c === 'white' ? 'black' : 'white')

const piece = (kind: Kind, color: Color): Piece => ({ kind, color })

/** Checkmate in a *legal* position: the side not to move must not also be in check. */
function isMate(pos: MovePosition, sideToMove: Color): boolean {
  if (isInCheck(pos, otherColor(sideToMove))) return false
  if (!isInCheck(pos, sideToMove)) return false
  return allLegalMoves(pos, sideToMove).length === 0
}

/**
 * The first checkmate found over **every** placement of `pieces`, or `null` if none
 * exists. Exhaustive: 64 × 63 × 62 arrangements for three pieces, both sides to move.
 */
function findAnyMate(rules: RuleSet, pieces: readonly Piece[]): string | null {
  const board: (Piece | null)[] = Array.from({ length: 64 }, () => null)
  let found: string | null = null

  const place = (n: number): void => {
    if (found) return
    if (n === pieces.length) {
      for (const sideToMove of ['white', 'black'] as const) {
        if (isMate(analysisPosition(board, rules), sideToMove)) found = describePosition(board, sideToMove)
      }
      return
    }
    for (let square = 0; square < 64 && !found; square++) {
      if (board[square]) continue
      board[square] = pieces[n]!
      place(n + 1)
      board[square] = null
    }
  }
  place(0)
  return found
}

function describePosition(board: readonly (Piece | null)[], sideToMove: Color): string {
  const parts: string[] = []
  for (let i = 0; i < 64; i++) {
    const p = board[i]
    if (p) parts.push(`${p.color[0]}${p.kind}${String.fromCharCode(97 + (i % 8))}${Math.floor(i / 8) + 1}`)
  }
  return `${parts.join(' ')} — ${sideToMove} to move`
}

/**
 * The first checkmate with one bishop each, both on the same square colour.
 *
 * Naively this is 8.4 million arrangements. Two sound observations cut it to a few
 * thousand full mate tests:
 *
 * 1. **Only the white bishop can be giving check.** A king delivering check would mean
 *    the kings attack each other, which makes the position illegal whoever is to move.
 * 2. **The black bishop can remove at most one black king escape.** It may *occupy* a
 *    flight square, but it can never make one *attacked* — so any arrangement of the
 *    other three pieces that leaves the black king two flights can never become mate,
 *    whatever is done with the fourth. That prunes the inner loop entirely.
 */
function findSameColourBishopMate(rules: RuleSet): string | null {
  const board: (Piece | null)[] = Array.from({ length: 64 }, () => null)
  const whiteBishop = piece('B', 'white')
  const blackBishop = piece('B', 'black')

  for (let wb = 0; wb < 64; wb++) {
    const parity = parityOf(wb)
    board[wb] = whiteBishop
    for (let wk = 0; wk < 64; wk++) {
      if (wk === wb) continue
      board[wk] = piece('K', 'white')
      for (let bk = 0; bk < 64; bk++) {
        if (bk === wb || bk === wk) continue
        board[bk] = piece('K', 'black')
        const pos = analysisPosition(board, rules)
        const worthTrying = isInCheck(pos, 'black')
          && !isInCheck(pos, 'white')
          && legalMovesFor(pos, coordOf(bk)).length <= 1
        for (let bb = 0; worthTrying && bb < 64; bb++) {
          if (parityOf(bb) !== parity || bb === wb || bb === wk || bb === bk) continue
          board[bb] = blackBishop
          const mate = isMate(analysisPosition(board, rules), 'black')
          board[bb] = null
          if (mate) {
            board[bb] = blackBishop
            const found = describePosition(board, 'black')
            board[bb] = null; board[bk] = null; board[wk] = null; board[wb] = null
            return found
          }
        }
        board[bk] = null
      }
      board[wk] = null
    }
    board[wb] = null
  }
  return null
}

/** Every combination of two pieces' portal settings, as labelled rulesets. */
function flagMatrix(first: Kind, second: Kind): readonly (readonly [string, RuleSet])[] {
  const out: (readonly [string, RuleSet])[] = []
  for (const [aLabel, a] of MODES) {
    for (const [bLabel, b] of MODES) {
      out.push([`${first}=${aLabel} ${second}=${bLabel}`, ruleSetFrom({ [first]: a, [second]: b })])
    }
  }
  return out
}

describe('insufficient material — the enumeration that proves it', () => {
  it('K vs K: no checkmate exists, whatever the king may do at the seam', () => {
    for (const [, king] of MODES) {
      const rules = ruleSetFrom({ K: king })
      expect(findAnyMate(rules, [piece('K', 'white'), piece('K', 'black')])).toBeNull()
    }
  }, 60_000)

  it('K+N vs K: no checkmate exists under any knight/king flags', () => {
    // Worth stating plainly: a knight that wraps the seam attacks the same *number* of
    // squares from the edge as from the centre, and it still cannot mate alone.
    for (const [label, rules] of flagMatrix('N', 'K')) {
      const mate = findAnyMate(rules, [piece('K', 'white'), piece('N', 'white'), piece('K', 'black')])
      expect(mate, `${label} unexpectedly admits ${mate}`).toBeNull()
    }
  }, 120_000)

  it('K+B vs K: mate exists exactly when the bishop may capture through the seam', () => {
    for (const [bishopLabel, bishop] of MODES) {
      for (const [kingLabel, king] of MODES) {
        const rules = ruleSetFrom({ B: bishop, K: king })
        const mate = findAnyMate(rules, [piece('K', 'white'), piece('B', 'white'), piece('K', 'black')])
        const label = `B=${bishopLabel} K=${kingLabel}`

        expect(mate !== null, `${label}: mate ${mate ?? 'absent'}`).toBe(bishop.capture)
        // ...which is exactly the gate the rule uses.
        const position = fromPiecesSpec('w:Ke1,Bc1; b:Ke8', 'white', rules)
        expect(isInsufficientMaterial(position), label).toBe(!bishop.capture)
      }
    }
  }, 120_000)

  it('K+B vs K: the answer does not depend on which side owns the bishop', () => {
    for (const [, bishop] of MODES) {
      const rules = ruleSetFrom({ B: bishop })
      const mate = findAnyMate(rules, [piece('K', 'white'), piece('B', 'black'), piece('K', 'black')])
      expect(mate !== null).toBe(bishop.capture)
    }
  }, 60_000)

  it('K+B vs K+B on one colour: mate exists exactly when a bishop may capture across', () => {
    // The *position* class is decided by the capture right, as row three is. The rule
    // nonetheless gates this row on the wider `portalEnabled`, because a bishop with only
    // the quiet right can hop the seam and change square colour — at which point the
    // material is no longer "same colour" and the class this enumeration covers no longer
    // describes the game. The next test pins that distinction down.
    for (const [label, rules] of flagMatrix('B', 'K')) {
      const bishopCaptures = rules.portal.B.capture
      const mate = findSameColourBishopMate(rules)
      expect(mate !== null, `${label}: mate ${mate ?? 'absent'}`).toBe(bishopCaptures)
    }
  }, 300_000)

  it('a quiet-only bishop still changes square colour, which is why the gate is wider', () => {
    // Bc1 is dark. Crossing the seam preserves rank and swaps file f for 7-f, and since
    // 0 and 7 differ in parity the square colour flips. Two same-coloured bishops can
    // therefore become opposite-coloured, and opposite-coloured bishops mate even in
    // chess — so the position was never dead.
    const rules = ruleSetFrom({ B: { quiet: true, capture: false } })
    const before = fromPiecesSpec('w:Ke1,Bb2; b:Ke8,Bg7', 'white', rules)
    expect(isInsufficientMaterial(before)).toBe(false)

    const crossed = reduceMove(before, move('b2', 'h1'))
    expect(crossed).not.toBe(before)
    expect(parityOf(parseAlgebraic('b2').r * 8 + parseAlgebraic('b2').f))
      .not.toBe(parityOf(parseAlgebraic('h1').r * 8 + parseAlgebraic('h1').f))
  }, 30_000)
})
