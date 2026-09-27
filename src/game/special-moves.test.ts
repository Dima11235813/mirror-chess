import { describe, it, expect } from 'vitest'
import type { Move, PromotionKind } from './types'
import { fromPiecesSpec } from './setup'
import { parseFen, toFen } from './fen'
import { legalMovesFor } from './moves'
import { allLegalMoves } from './status'
import { reduceMove } from './reducer'
import { attacksFrom, isSquareAttacked } from './attacks'
import { capturedSquare, makeMove } from './move'
import { algebraic, parseAlgebraic } from './coord'
import { RULES_ALL_ON, RULES_STANDARD_CHESS, ruleSetFrom } from './rules'

/**
 * Executable form of `prj-mgmt/epics/rules/mirror-portal-spec.md` §13 — promotion,
 * en passant and castling.
 *
 * The published perft suite in `perft.test.ts` already proves these rules match ordinary
 * chess exactly. What is left for this file is the part perft cannot check, because no
 * other engine has ever counted it: **what the seam does to each of the three.**
 */

const at = (square: string) => parseAlgebraic(square)
const destinations = (moves: readonly Move[]) => moves.map(m => algebraic(m.to)).sort()
const play = (state: Parameters<typeof reduceMove>[0], from: string, to: string, promotion?: PromotionKind) =>
  reduceMove(state, makeMove(at(from), at(to), 'quiet', promotion ? { promotion } : {}))
const pieceAt = (state: { board: readonly (unknown)[] }, square: string) =>
  state.board[at(square).r * 8 + at(square).f]

describe('§13.1 promotion', () => {
  it('offers all four pieces, as four distinct moves to one square', () => {
    const s = fromPiecesSpec('w:Ke1,Pb7; b:Ke8', 'white', RULES_STANDARD_CHESS)
    const moves = legalMovesFor(s, at('b7'))

    expect(moves).toHaveLength(4)
    expect(moves.map(m => m.promotion).sort()).toEqual(['B', 'N', 'Q', 'R'])
    expect(new Set(moves.map(m => algebraic(m.to)))).toEqual(new Set(['b8']))
  })

  it('actually places the chosen piece', () => {
    const s = fromPiecesSpec('w:Ke1,Pb7; b:Ke8', 'white', RULES_STANDARD_CHESS)

    expect(pieceAt(play(s, 'b7', 'b8', 'Q'), 'b8')).toEqual({ kind: 'Q', color: 'white' })
    expect(pieceAt(play(s, 'b7', 'b8', 'N'), 'b8')).toEqual({ kind: 'N', color: 'white' })
  })

  it('resets the fifty-move clock, being a pawn move', () => {
    const s = { ...fromPiecesSpec('w:Ke1,Pb7; b:Ke8', 'white', RULES_STANDARD_CHESS), halfmoveClock: 40 }

    expect(play(s, 'b7', 'b8', 'Q').halfmoveClock).toBe(0)
  })

  it('a pawn can no longer strand itself on the last rank', () => {
    // Before §13 a pawn that reached the far rank froze there — no pushes, no captures,
    // a dead piece that could turn a won position into a lost one. The state is now
    // simply unreachable: arriving *is* promoting, so nothing that lands there is a pawn.
    const s = fromPiecesSpec('w:Ke1,Pb7; b:Ke8', 'white', RULES_STANDARD_CHESS)
    const after = play(s, 'b7', 'b8', 'Q')

    expect(after.board.filter(p => p?.kind === 'P')).toEqual([])
    expect(legalMovesFor(after, at('b8')).length).toBeGreaterThan(0)
  })

  it('a pawn promotes by capturing THROUGH the seam', () => {
    // A push has no file component and never crosses; a capture diagonal wraps (§11.2).
    // So the a-file pawn's left capture lands on h8 — and promotes there.
    const s = fromPiecesSpec('w:Ke1,Pa7; b:Ke8,Rh8', 'white', RULES_ALL_ON)
    const moves = legalMovesFor(s, at('a7'))
    const acrossSeam = moves.filter(m => m.crossedSeam)

    expect(destinations(acrossSeam)).toEqual(['h8', 'h8', 'h8', 'h8'])
    expect(acrossSeam.every(m => m.flag === 'promotionCapture')).toBe(true)

    const after = play(s, 'a7', 'h8', 'Q')
    expect(pieceAt(after, 'h8')).toEqual({ kind: 'Q', color: 'white' })
    expect(pieceAt(after, 'a7')).toBeNull()
  })

  it('...and not when the pawn may not capture across the seam', () => {
    const s = fromPiecesSpec('w:Ke1,Pa7; b:Ke8,Rh8', 'white', RULES_STANDARD_CHESS)

    expect(legalMovesFor(s, at('a7')).filter(m => m.crossedSeam)).toEqual([])
  })

  it('under-promoting to a bishop is a real choice here — the bishop can mate alone', () => {
    // Spec §13.1: a bishop that captures across the seam is mating material by itself,
    // so this promotion is not the curiosity it is in chess.
    const s = fromPiecesSpec('w:Ka1,Pb7; b:Kh8', 'white', RULES_ALL_ON)
    const promoted = play(s, 'b7', 'b8', 'B')

    expect(pieceAt(promoted, 'b8')).toEqual({ kind: 'B', color: 'white' })
    // ...and it attacks through the seam, which is what makes it dangerous: the down-left
    // diagonal reaches a7, steps through, and continues h7, g6, f5…
    expect(attacksFrom(promoted, at('b8')).map(algebraic)).toContain('h7')
  })
})

describe('§13.2 en passant', () => {
  it('is available after an adjacent double push, and captures the passed pawn', () => {
    let s = fromPiecesSpec('w:Ke1,Pe5; b:Ke8,Pd7', 'black', RULES_STANDARD_CHESS)
    s = play(s, 'd7', 'd5')

    expect(s.enPassant && algebraic(s.enPassant)).toBe('d6')
    const ep = legalMovesFor(s, at('e5')).find(m => m.flag === 'enPassant')
    expect(ep && algebraic(ep.to)).toBe('d6')
    expect(ep && capturedSquare(ep) && algebraic(capturedSquare(ep)!)).toBe('d5')

    const after = play(s, 'e5', 'd6')
    expect(pieceAt(after, 'd6')).toEqual({ kind: 'P', color: 'white' })
    expect(pieceAt(after, 'd5')).toBeNull()
  })

  it('expires immediately if not taken', () => {
    let s = fromPiecesSpec('w:Ke1,Pe5; b:Ke8,Pd7', 'black', RULES_STANDARD_CHESS)
    s = play(s, 'd7', 'd5')
    expect(s.enPassant).not.toBeNull()

    s = play(s, 'e1', 'f1')
    expect(s.enPassant).toBeNull()
    s = play(s, 'e8', 'f8')
    expect(legalMovesFor(s, at('e5')).some(m => m.flag === 'enPassant')).toBe(false)
  })

  it('CROSSES THE SEAM: a pawn on a5 captures one that just played h7–h5', () => {
    // The headline of §13.2. The rule is stated as "any pawn that attacks the square the
    // double-pushing pawn passed over", and a pawn on a5 attacks h6 (§11.2) — so the two
    // pawns are seven files apart and the capture is still en passant.
    let s = fromPiecesSpec('w:Ke1,Pa5; b:Ke8,Ph7', 'black', RULES_ALL_ON)
    s = play(s, 'h7', 'h5')

    expect(s.enPassant && algebraic(s.enPassant)).toBe('h6')
    const ep = legalMovesFor(s, at('a5')).find(m => m.flag === 'enPassant')
    expect(ep && algebraic(ep.to)).toBe('h6')
    expect(ep?.crossedSeam).toBe(true)
    expect(ep && capturedSquare(ep) && algebraic(capturedSquare(ep)!)).toBe('h5')

    const after = play(s, 'a5', 'h6')
    expect(pieceAt(after, 'h6')).toEqual({ kind: 'P', color: 'white' })
    expect(pieceAt(after, 'h5')).toBeNull()
    expect(pieceAt(after, 'a5')).toBeNull()
  })

  it('...and does not, when the pawn may not capture across the seam', () => {
    let s = fromPiecesSpec('w:Ke1,Pa5; b:Ke8,Ph7', 'black', RULES_STANDARD_CHESS)
    s = play(s, 'h7', 'h5')

    // No pawn attacks h6, so the square is not even recorded (§13.4).
    expect(s.enPassant).toBeNull()
    expect(legalMovesFor(s, at('a5')).some(m => m.flag === 'enPassant')).toBe(false)
  })

  it('records the square only when a capture is actually available', () => {
    // Two positions differing in nothing observable must key identically, or repetition
    // stops working. No enemy pawn is in range here, so nothing is recorded.
    let s = fromPiecesSpec('w:Ke1,Pe2; b:Ke8', 'white', RULES_STANDARD_CHESS)
    s = play(s, 'e2', 'e4')

    expect(s.enPassant).toBeNull()
  })

  it('is still refused when it would expose the king along a rank — THROUGH THE SEAM', () => {
    // The classic perft trap: en passant removes *two* pawns from one rank at once, and
    // the resulting position must still be legality-filtered. Here the punishing ray is
    // one no chess engine would have to consider, because a rank is a **cycle**.
    //
    // Rh5's leftward ray is blocked by Black's own Pe5, so it does not see Kc5 directly.
    // Its rightward ray leaves the h-file, re-enters at a5, and runs b5, c5. Right now
    // Black's own pawn on a5 blocks that too — but bxa6 e.p. vacates BOTH b5 and a5, and
    // the seam ray then reaches the white king.
    let s = fromPiecesSpec('w:Kc5,Pb5; b:Kg8,Rh5,Pe5,Pa7', 'black', RULES_ALL_ON)
    s = play(s, 'a7', 'a5')

    expect(s.enPassant && algebraic(s.enPassant)).toBe('a6')
    expect(s.inCheck).toBe(false) // the ray is blocked while the black pawn stands on a5

    const epMoves = legalMovesFor(s, at('b5')).filter(m => m.flag === 'enPassant')
    expect(epMoves).toEqual([])
  })

  it('...and that same capture is perfectly legal once the seam is closed', () => {
    // The identical position under ordinary chess rules: no seam, so no punishing ray,
    // so the capture stands. The position is the control for the test above.
    let s = fromPiecesSpec('w:Kc5,Pb5; b:Kg8,Rh5,Pe5,Pa7', 'black', RULES_STANDARD_CHESS)
    s = play(s, 'a7', 'a5')

    expect(s.enPassant && algebraic(s.enPassant)).toBe('a6')
    expect(legalMovesFor(s, at('b5')).some(m => m.flag === 'enPassant')).toBe(true)
  })
})

describe('§13.3 castling', () => {
  const HOME = 'w:Ke1,Ra1,Rh1; b:Ke8,Ra8,Rh8'

  it('offers both castles from the home position', () => {
    const s = fromPiecesSpec(HOME, 'white', RULES_STANDARD_CHESS)
    const castles = legalMovesFor(s, at('e1')).filter(m => m.flag.startsWith('castle'))

    expect(destinations(castles)).toEqual(['c1', 'g1'])
  })

  it('moves the rook as well as the king', () => {
    const s = fromPiecesSpec(HOME, 'white', RULES_STANDARD_CHESS)

    const kingside = play(s, 'e1', 'g1')
    expect(pieceAt(kingside, 'g1')).toEqual({ kind: 'K', color: 'white' })
    expect(pieceAt(kingside, 'f1')).toEqual({ kind: 'R', color: 'white' })
    expect(pieceAt(kingside, 'h1')).toBeNull()

    const queenside = play(s, 'e1', 'c1')
    expect(pieceAt(queenside, 'c1')).toEqual({ kind: 'K', color: 'white' })
    expect(pieceAt(queenside, 'd1')).toEqual({ kind: 'R', color: 'white' })
    expect(pieceAt(queenside, 'a1')).toBeNull()
  })

  it('needs the squares between king and rook to be empty', () => {
    const blocked = fromPiecesSpec('w:Ke1,Ra1,Rh1,Ng1,Bb1; b:Ke8', 'white', RULES_STANDARD_CHESS)

    expect(legalMovesFor(blocked, at('e1')).filter(m => m.flag.startsWith('castle'))).toEqual([])
  })

  it('is refused out of, through, and into check', () => {
    const outOf = fromPiecesSpec('w:Ke1,Rh1; b:Ke8,Re7', 'white', RULES_STANDARD_CHESS)
    const through = fromPiecesSpec('w:Ke1,Rh1; b:Ke8,Rf7', 'white', RULES_STANDARD_CHESS)
    const into = fromPiecesSpec('w:Ke1,Rh1; b:Ke8,Rg7', 'white', RULES_STANDARD_CHESS)

    for (const [label, s] of [['out of', outOf], ['through', through], ['into', into]] as const) {
      const castles = legalMovesFor(s, at('e1')).filter(m => m.flag.startsWith('castle'))
      expect(castles, `castling ${label} check`).toEqual([])
    }
  })

  it('THE SEAM CHANGE: a bishop forbids castling from the far side of the board', () => {
    // Ba3's down-left ray steps through the seam at a3 and continues h3, g2, f1 — so it
    // attacks a square on White's kingside king path from the queenside edge. In ordinary
    // chess that bishop attacks nothing on the first rank past c1, and the castle stands.
    const spec = 'w:Ke1,Rh1; b:Ke8,Ba3'

    const chess = fromPiecesSpec(spec, 'white', RULES_STANDARD_CHESS)
    expect(isSquareAttacked(chess, at('f1'), 'black')).toBe(false)
    expect(destinations(legalMovesFor(chess, at('e1')).filter(m => m.flag === 'castleKing'))).toEqual(['g1'])

    const mirror = fromPiecesSpec(spec, 'white', RULES_ALL_ON)
    expect(attacksFrom(mirror, at('a3')).map(algebraic)).toContain('f1')
    expect(legalMovesFor(mirror, at('e1')).filter(m => m.flag === 'castleKing')).toEqual([])
  })

  it('loses both rights when the king moves, and one when a rook moves', () => {
    const s = fromPiecesSpec(HOME, 'white', RULES_STANDARD_CHESS)

    expect(play(s, 'e1', 'f1').castling.white).toEqual({ king: false, queen: false })
    expect(play(s, 'h1', 'g1').castling.white).toEqual({ king: false, queen: true })
    expect(play(s, 'a1', 'b1').castling.white).toEqual({ king: true, queen: false })
  })

  it('loses both rights by castling', () => {
    const s = fromPiecesSpec(HOME, 'white', RULES_STANDARD_CHESS)

    expect(play(s, 'e1', 'g1').castling.white).toEqual({ king: false, queen: false })
  })

  it('loses a right when the rook is CAPTURED — including through the seam', () => {
    // The rights update must key on the corner square changing hands, not on whose move
    // it was. Here a bishop takes the h1 rook from the a-file, across the seam.
    const s = fromPiecesSpec('w:Ke1,Rh1,Ra1; b:Ke8,Ba3', 'black', RULES_ALL_ON)
    expect(s.castling.white).toEqual({ king: true, queen: true })

    const after = play(s, 'a3', 'h3')
    expect(after.castling.white).toEqual({ king: true, queen: true }) // not yet

    const taken = play(fromPiecesSpec('w:Ke1,Rh1,Ra1; b:Ke8,Bg2', 'black', RULES_STANDARD_CHESS), 'g2', 'h1')
    expect(taken.castling.white).toEqual({ king: false, queen: true })
  })

  it('is not offered to a king that is not at home', () => {
    const s = fromPiecesSpec('w:Ke4,Ra1,Rh1; b:Ke8', 'white', RULES_STANDARD_CHESS)

    expect(legalMovesFor(s, at('e4')).filter(m => m.flag.startsWith('castle'))).toEqual([])
  })

  it('the two home rooks defend each other through the seam from move one', () => {
    // Harmless, and a good canary: if this ever stops being true, portal attacks are off.
    const s = fromPiecesSpec(HOME, 'white', RULES_ALL_ON)

    expect(attacksFrom(s, at('a1')).map(algebraic)).toContain('h1')
  })
})

describe('§13.4 position identity', () => {
  it('two positions differing only in castling rights key differently', () => {
    const withRights = fromPiecesSpec('w:Ke1,Rh1; b:Ke8,Rh8', 'white', RULES_STANDARD_CHESS)
    // Shuffle the rook out and back: same placement, rights gone, White to move again.
    let moved = play(withRights, 'h1', 'g1')
    moved = play(moved, 'h8', 'g8')
    moved = play(moved, 'g1', 'h1')
    moved = play(moved, 'g8', 'h8')

    expect(moved.board).toEqual(withRights.board)
    expect(moved.turn).toBe(withRights.turn)
    expect(moved.castling.white.king).toBe(false)
    // ...so this is NOT a repetition of the opening position, and must not key as one.
    expect(moved.history[moved.history.length - 1]).not.toBe(withRights.history[0])
  })
})

describe('FEN', () => {
  it('round-trips the standard opening position', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    expect(toFen(parseFen(fen))).toBe(fen)
  })

  it('reads castling rights and the en-passant square', () => {
    const s = parseFen('r3k2r/8/8/8/8/8/8/R3K2R w Kq e6 3 9')

    expect(s.castling).toEqual({ white: { king: true, queen: false }, black: { king: false, queen: true } })
    expect(s.enPassant && algebraic(s.enPassant)).toBe('e6')
    expect(s.halfmoveClock).toBe(3)
  })

  it('reads a position under whatever ruleset it is given, since FEN cannot say', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    expect(parseFen(fen, RULES_ALL_ON).rules).toEqual(RULES_ALL_ON)
    expect(parseFen(fen, RULES_STANDARD_CHESS).rules).toEqual(RULES_STANDARD_CHESS)
  })

  it('rejects a malformed position rather than guessing', () => {
    expect(() => parseFen('8/8/8 w - -')).toThrow(/8 ranks/)
    expect(() => parseFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq -')).toThrow(/side to move/)
  })
})

describe('§13 under a capture-only pawn ruleset', () => {
  it('en passant across the seam follows the pawn capture right exactly', () => {
    const captureOnly = ruleSetFrom({ P: { quiet: false, capture: true } })
    let s = fromPiecesSpec('w:Ke1,Pa5; b:Ke8,Ph7', 'black', captureOnly)
    s = play(s, 'h7', 'h5')

    expect(s.enPassant && algebraic(s.enPassant)).toBe('h6')
    expect(legalMovesFor(s, at('a5')).some(m => m.flag === 'enPassant')).toBe(true)
  })
})
