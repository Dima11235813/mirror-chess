import { useMemo, useState } from 'react'
import type { Color, Coord, GameState, Kind, Move, Piece, PromotionKind } from '@game/types'
import { algebraic, coordEq, sameCoord } from '@game/coord'
import { legalMovesFor, pseudoLegalMovesFor } from '@game/moves'
import { capturedSquare, isPromotion } from '@game/move'
import { checkingPieces, checkPath, findKing } from '@game/attacks'
import { IonButton } from '@ionic/react'
import { PromotionPicker } from './PromotionPicker'
import { ReservedText } from './ReservedText/ReservedText'
import { isGameOver, type GameStatus } from '@game/status'
import {
  MOVE_MESSAGE_TESTID,
  SquareHintClass,
  SquareStateClass,
  SUBMIT_BAR_TESTID,
  SUBMIT_BAR_SLOT_TESTID,
  SUBMIT_MOVE_TESTID,
  CANCEL_MOVE_TESTID,
  HELD_TESTID,
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
  /**
   * Commit a move the moment a destination is chosen.
   *
   * `false` holds it instead and waits for an explicit Submit, which is what makes the
   * board safe to use with a thumb (`submit-move.md`). The shell owns the preference; the
   * board only obeys it.
   */
  readonly autoSubmit?: boolean
}

/** Message shown when a player picks a square their king's safety forbids. */
const SELF_CHECK_MESSAGE = 'Not allowed: that move would leave your king in check.'

/** Shown while a piece belonging to the other side has its moves on display. */
const PREVIEW_MESSAGE = 'Showing what this piece could do — you cannot play it right now.'

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

/**
 * Whose piece is on `square`, if any.
 *
 * The board asks this to decide between three answers to a tap: play it, **preview** it,
 * or do nothing.
 *
 * **Preview belongs to the colour, not to the board's state.** A piece of the side *not*
 * to move is previewed — that is the feature, and it commits nothing. A piece of the side
 * to move is never previewed, even when it cannot be played: a drawn game and a board
 * locked while the engine thinks must both keep offering **nothing** for the piece a
 * player might otherwise expect to move, which is what `draw-rules.e2e.ts` and
 * `opponent.e2e.ts` have guarded since before previews existed. Generalising preview to
 * "anything you cannot play" broke both of them, and the narrower rule is also the one
 * that was asked for.
 */
function colourOn(state: GameState, square: Coord): Color | null {
  return state.board[coordIndex(square)]?.color ?? null
}

/**
 * The moves to show for a piece being **previewed** rather than played.
 *
 * Identical to `legalMovesFor` with one deliberate exception: **the en-passant square is
 * cleared first.** That right belongs to the side to move, and it expires after a single
 * move — so by the time it is genuinely this piece's turn, it is gone either way. Without
 * this, previewing a black pawn on `d7` right after black played `e7-e5` offers `e6 e.p.`,
 * which would capture black's own pawn. Measured with a probe before this was built, and
 * it is the one place where "turn is deliberately not checked" (`moves.ts`) leaks.
 */
function previewMovesFor(state: GameState, square: Coord): readonly Move[] {
  return legalMovesFor({ ...state, enPassant: null }, square)
}

export function BoardView({
  state,
  status,
  onMove,
  locked = false,
  autoSubmit = true,
}: BoardViewProps) {
  const [selected, setSelected] = useState<Coord | null>(null)
  const [message, setMessage] = useState<string>('')
  const [pending, setPending] = useState<PendingPromotion | null>(null)
  /** A move chosen but not yet committed, when auto-submit is off. */
  const [awaitingSubmit, setAwaitingSubmit] = useState<Move | null>(null)

  // A finished game offers nothing *playable*. Checkmate and stalemate take care of
  // themselves — there are no legal moves — but the three draws leave legal moves on the
  // board, so without this the UI would hint at moves the reducer then refuses. It still
  // previews: showing what a piece could do commits nothing.
  const frozen = isGameOver(status) || locked
  const selectedColour = selected ? colourOn(state, selected) : null
  /** The other side's piece: show what it could do, but it is not yours to play. */
  const previewing = selectedColour !== null && selectedColour !== state.turn
  /** Your piece, on your turn, on a live board: the only case that produces a move. */
  const playable = selectedColour === state.turn && !frozen

  const legal = useMemo(() => {
    if (!selected) return []
    if (previewing) return previewMovesFor(state, selected)
    return playable ? legalMovesFor(state, selected) : []
  }, [state, selected, previewing, playable])
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
    setAwaitingSubmit(null)
    setMessage('')
  }

  /** Commit now, or hold for an explicit Submit — the one place the preference is read. */
  const choose = (m: Move) => {
    if (autoSubmit) finish(m)
    else {
      setAwaitingSubmit(m)
      setPending(null)
      setMessage('')
    }
  }

  const cancelPending = () => {
    setAwaitingSubmit(null)
    setSelected(null)
    setMessage('')
  }

  const clickSquare = (c: Coord) => {
    // While a move waits to be submitted the board is read-only: the only two answers are
    // Submit and Cancel. Letting a tap quietly re-target would make the button a lie.
    if (pending || awaitingSubmit) return

    if (selected && playable) {
      // A promotion arrives as four moves to the same square, so the destination alone
      // does not identify one — ask which piece before committing.
      const choices = legal.filter(m => sameCoord(m.to, c))
      const first = choices[0]
      if (first) {
        if (isPromotion(first)) setPending({ square: c, moves: choices })
        else choose(first)
        return
      }
      // The square was reachable by the piece's movement, but king safety forbids it.
      if (pseudoLegalMovesFor(state, selected).some(p => sameCoord(p.to, c))) {
        setMessage(SELF_CHECK_MESSAGE)
        return
      }
    }

    // Selecting. A piece that cannot be played is previewed rather than ignored — tapping
    // an enemy knight to see where it could go is the question players actually ask. A
    // tap on a previewed square just clears, because there is nothing to commit.
    const colour = colourOn(state, c)
    const next = colour ? c : null
    setSelected(next)
    setMessage(colour && colour !== state.turn ? PREVIEW_MESSAGE : '')
  }

  const choosePromotion = (kind: PromotionKind) => {
    const move = pending?.moves.find(m => m.promotion === kind)
    // Even a promotion goes through `choose`: picking the piece says *which* move, not
    // that it should be played, and with auto-submit off the player still gets the last word.
    if (move) choose(move)
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
          const isHeld = !!awaitingSubmit && sameCoord(awaitingSubmit.to, c)
          const checkRole = check.roleOf(sq)
          const showEpCapOverlay = epCapturedSquares.has(sq)

          return (
            <button
              key={i}
              className={squareClasses(isLight, isSelected, checkRole)}
              onClick={() => clickSquare(c)}
              aria-label={describeSquare({
                square: sq, piece, hint, checkRole, selected: isSelected, preview: previewing,
              })}
              data-testid={squareTestId(sq)}
            >
              {showEpCapOverlay && (
                <div
                  className={`${SquareHintClass.Hint} ${SquareHintClass.EnPassantCaptured}`}
                  data-testid={hintTestId(sq)}
                />
              )}
              <div className="glyph">{piece ? pieceToGlyph(piece) : ''}</div>
              {hint && (
                <div
                  className={`${hintClassesFor(hint)}${previewing ? ` ${SquareHintClass.Preview}` : ''}`}
                  data-testid={hintTestId(sq)}
                />
              )}
              {isHeld && <div className={SquareHintClass.Held} data-testid={HELD_TESTID} />}
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
      {/*
        Two lines of space, held whether or not there is a message — both of the real
        messages wrap to two lines on a phone, and the footer and the opponent controls
        used to move every time a piece was tapped
        (`prj-mgmt/epics/quality/layout-shift.md`).
      */}
      <ReservedText
        lines={2}
        live
        as="p"
        label="the board's message"
        wrapperClassName="moveMessageSlot"
        className={`moveMessage${message === PREVIEW_MESSAGE ? ' info' : ''}`}
        testId={MOVE_MESSAGE_TESTID}
      >
        {message}
      </ReservedText>

      {/*
        Auto-submit off: the move is chosen but not played. The bar says *which* move, so
        the player is confirming a thing rather than confirming blindly — and it is a live
        region, because it appears in response to a tap (CLAUDE.md §7).

        The space is reserved whenever confirmation is **switched on**, not whenever a move
        is waiting: the bar's arrival would otherwise push everything below the board down
        on every single move. Keyed on the setting rather than the state because the
        setting is the thing that does not change during play — and with auto-submit on
        the bar can never appear, so there is nothing to hold space for.
      */}
      {!autoSubmit && (
        <div className="submitBarSlot" data-testid={SUBMIT_BAR_SLOT_TESTID}>
          {awaitingSubmit && (
            <div className="submitBar" role="status" aria-live="polite" data-testid={SUBMIT_BAR_TESTID}>
              <span className="submitBarMove">
                {algebraic(awaitingSubmit.from)}–{algebraic(awaitingSubmit.to)}
                {awaitingSubmit.crossedSeam ? '*' : ''}
                {awaitingSubmit.promotion ? `=${awaitingSubmit.promotion}` : ''}
              </span>
              <IonButton size="small" data-testid={SUBMIT_MOVE_TESTID} onClick={() => finish(awaitingSubmit)}>
                Submit move
              </IonButton>
              <IonButton size="small" fill="outline" data-testid={CANCEL_MOVE_TESTID} onClick={cancelPending}>
                Cancel
              </IonButton>
            </div>
          )}
        </div>
      )}
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
