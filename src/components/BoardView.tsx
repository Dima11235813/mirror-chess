import { useMemo, useState } from 'react'
import type { Coord, GameState, Kind, Move, Piece, PromotionKind } from '@game/types'
import { algebraic, coordEq, sameCoord } from '@game/coord'
import { legalMovesFor, pseudoLegalMovesFor } from '@game/moves'
import { capturedSquare, isPromotion } from '@game/move'
import { checkingPieces, checkPath, findKing } from '@game/attacks'
import { PromotionPicker } from './PromotionPicker'
import { isGameOver, type GameStatus } from '@game/status'
import {
  MOVE_MESSAGE_TESTID,
  SquareHintClass,
  SquareStateClass,
  hintTestId,
  squareTestId,
} from '@shared/ui/selectors'
import {
  describeSquare,
  hintClassesFor,
  type SquareCheckRole,
  type SquareHintKind,
} from '@shared/ui/square-presentation'

export interface BoardViewProps {
  readonly state: GameState
  /** Classification of the position, computed once by the shell and passed down. */
  readonly status: GameStatus
  readonly onMove: (m: Move) => void
  /**
   * Refuse input — it is not this player's board right now.
   *
   * Set while the engine is thinking, or when it is the engine's turn at all. Without it a
   * player could move for their opponent, and the engine's reply would then be computed
   * for a position that never existed.
   */
  readonly locked?: boolean
}

/** Message shown when a player picks a square their king's safety forbids. */
const SELF_CHECK_MESSAGE = 'Not allowed: that move would leave your king in check.'

/**
 * The chess board.
 *
 * Render-only: it asks the game core which moves are legal, which piece is giving
 * check and where the check travels, then draws the answer. It never decides any of
 * that itself.
 */
/** A promotion the player has committed to a square for, but not yet chosen a piece for. */
interface PendingPromotion {
  readonly square: Coord
  /** The four moves to that square, one per promotion piece. */
  readonly moves: readonly Move[]
}

export function BoardView({ state, status, onMove, locked = false }: BoardViewProps) {
  const [selected, setSelected] = useState<Coord | null>(null)
  const [message, setMessage] = useState<string>('')
  const [pending, setPending] = useState<PendingPromotion | null>(null)

  // A finished game offers nothing. Checkmate and stalemate take care of themselves —
  // there are no legal moves to show — but the three draws leave legal moves on the
  // board, so without this the UI would hint at moves the reducer then refuses.
  const over = isGameOver(status) || locked
  const legal = useMemo(
    () => (selected && !over ? legalMovesFor(state, selected) : []),
    [state, selected, over],
  )
  const epCapturedSquares = useMemo(() => {
    const set = new Set<string>()
    for (const m of legal) {
      const victim = capturedSquare(m)
      if (m.flag === 'enPassant' && victim) set.add(algebraic(victim))
    }
    return set
  }, [legal])

  const check = useMemo(() => describeCheck(state, status), [state, status])

  const finish = (m: Move) => {
    onMove(m)
    setSelected(null)
    setPending(null)
    setMessage('')
  }

  const clickSquare = (c: Coord) => {
    if (over || pending) return
    if (selected) {
      // A promotion arrives as four moves to the same square, so the destination alone
      // does not identify one — ask which piece before committing.
      const choices = legal.filter(m => sameCoord(m.to, c))
      const first = choices[0]
      if (first) {
        if (isPromotion(first)) setPending({ square: c, moves: choices })
        else finish(first)
        return
      }
      // The square was reachable by the piece's movement, but king safety forbids it.
      if (pseudoLegalMovesFor(state, selected).some(p => sameCoord(p.to, c))) {
        setMessage(SELF_CHECK_MESSAGE)
        return
      }
    }
    setMessage('')
    const piece = state.board[coordIndex(c)]
    setSelected(piece && piece.color === state.turn ? c : null)
  }

  const choosePromotion = (kind: PromotionKind) => {
    const move = pending?.moves.find(m => m.promotion === kind)
    if (move) finish(move)
  }

  const selectedPiece = (selected ? state.board[coordIndex(selected)] : null) ?? null

  return (
    <div className="boardArea">
      <div className="board">
        {Array.from({ length: 8 * 8 }).map((_, i) => {
          const c: Coord = { r: 7 - Math.floor(i / 8), f: i % 8 }
          const sq = algebraic(c)
          const piece = state.board[coordIndex(c)] ?? null
          const isLight = (c.r + c.f) % 2 === 0
          const isSelected = !!selected && coordEq(selected, c)
          const moveToHere = legal.find(m => sameCoord(m.to, c))
          const hint = moveToHere ? hintKindOf(moveToHere) : null
          const checkRole = check.roleOf(sq)
          const showEpCapOverlay = epCapturedSquares.has(sq)

          return (
            <button
              key={i}
              className={squareClasses(isLight, isSelected, checkRole)}
              onClick={() => clickSquare(c)}
              aria-label={describeSquare({ square: sq, piece, hint, checkRole, selected: isSelected })}
              data-testid={squareTestId(sq)}
            >
              {showEpCapOverlay && (
                <div
                  className={`${SquareHintClass.Hint} ${SquareHintClass.EnPassantCaptured}`}
                  data-testid={hintTestId(sq)}
                />
              )}
              <div className="glyph">{piece ? pieceToGlyph(piece) : ''}</div>
              {hint && <div className={hintClassesFor(hint)} data-testid={hintTestId(sq)} />}
              {c.r === 0 && (
                <span className="coordLabel file" aria-hidden="true">{fileLabel(c.f)}</span>
              )}
              {c.f === 0 && (
                <span className="coordLabel rank" aria-hidden="true">{rankLabel(c.r)}</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="moveMessage" role="status" aria-live="polite" data-testid={MOVE_MESSAGE_TESTID}>
        {message}
      </p>
      {pending && (
        <PromotionPicker
          square={algebraic(pending.square)}
          color={state.turn}
          onChoose={choosePromotion}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

/**
 * Which marker a legal destination should carry.
 *
 * Reads the move's own `flag` rather than re-inspecting the board, so the marker can
 * never disagree with what the move actually does. `crossedSeam` is the one thing not
 * carried by the flag, because it is orthogonal — any kind of move may have crossed.
 */
function hintKindOf(move: Move): SquareHintKind {
  switch (move.flag) {
    case 'enPassant': return 'en-passant'
    case 'castleKing': case 'castleQueen': return 'castle'
    case 'promotion': return 'promotion'
    case 'promotionCapture': return 'promotion-capture'
    case 'capture': return move.crossedSeam ? 'mirror-capture' : 'capture'
    case 'quiet': case 'doublePush': return move.crossedSeam ? 'mirror-move' : 'move'
  }
}

interface CheckView {
  readonly roleOf: (square: string) => SquareCheckRole | null
}

/**
 * Resolve, once per position, which squares take part in the current check: the
 * king, the piece or pieces giving check, and the squares the check travels through
 * — which for a portal check includes the far side of the seam.
 */
function describeCheck(state: GameState, status: GameStatus): CheckView {
  const king = findKing(state.board, state.turn)
  const kingSquare = king ? algebraic(king) : null

  const kingRole: SquareCheckRole | null =
    status === 'checkmate' ? 'king-mated'
      : status === 'stalemate' ? 'king-stalemated'
        : status === 'check' ? 'king-in-check'
          : null

  const checkers = new Set<string>()
  const path = new Set<string>()
  if (king && (status === 'check' || status === 'checkmate')) {
    for (const attacker of checkingPieces(state, state.turn)) {
      checkers.add(algebraic(attacker))
      for (const step of checkPath(state, attacker, king)) path.add(algebraic(step))
    }
    path.delete(kingSquare ?? '') // the king carries its own marker
  }

  return {
    roleOf: (square: string): SquareCheckRole | null => {
      if (square === kingSquare) return kingRole
      if (checkers.has(square)) return 'checker'
      if (path.has(square)) return 'check-path'
      return null
    },
  }
}

function squareClasses(isLight: boolean, isSelected: boolean, role: SquareCheckRole | null): string {
  const classes = ['sq', isLight ? 'light' : 'dark']
  if (isSelected) classes.push(SquareStateClass.Selected)
  switch (role) {
    case 'king-in-check': classes.push(SquareStateClass.Check); break
    case 'king-mated': classes.push(SquareStateClass.Mate); break
    case 'king-stalemated': classes.push(SquareStateClass.Stalemate); break
    case 'checker': classes.push(SquareStateClass.Checker); break
    case 'check-path': classes.push(SquareStateClass.CheckPath); break
    case null: break
  }
  return classes.join(' ')
}

function pieceToGlyph(p: Piece): string {
  const map: Record<Kind, readonly [string, string]> = {
    K: ['♔', '♚'],
    Q: ['♕', '♛'],
    R: ['♖', '♜'],
    B: ['♗', '♝'],
    N: ['♘', '♞'],
    P: ['♙', '♟'],
  } as const
  return p.color === 'white' ? map[p.kind][0] : map[p.kind][1]
}

function coordIndex(c: Coord): number { return c.r * 8 + c.f }

function fileLabel(file: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + file)
}

function rankLabel(rank: number): string {
  // ranks are 1..8 from white's perspective
  return String(rank + 1)
}
