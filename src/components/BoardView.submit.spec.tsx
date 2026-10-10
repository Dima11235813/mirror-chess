import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardView } from './BoardView'
import { fromPiecesSpec } from '@game/setup'
import { gameStatus } from '@game/status'
import { RULES_ALL_ON } from '@game/rules'
import { algebraic } from '@game/coord'
import {
  hintTestId,
  squareTestId,
  SUBMIT_BAR_TESTID,
  SUBMIT_MOVE_TESTID,
  CANCEL_MOVE_TESTID,
  HELD_TESTID,
  PROMOTION_DIALOG_TESTID,
} from '@shared/ui/selectors'
import type { GameState, Move } from '@game/types'

/**
 * Confirming a move before it is played.
 * Story: `prj-mgmt/epics/user-moves/move-piece/submit-move.md`.
 *
 * `autoSubmit` defaults to `true`, which is the behaviour the app has always had, so these
 * all pass it explicitly as `false` — the mode under test.
 */
const show = (state: GameState, onMove: (m: Move) => void = () => {}, autoSubmit = false) =>
  render(
    <BoardView state={state} status={gameStatus(state)} onMove={onMove} autoSubmit={autoSubmit} />,
  )

const PAWN_GAME = () => fromPiecesSpec('w:Ke1,Pe2; b:Ke8,Pa7', 'white', RULES_ALL_ON)

describe('BoardView — confirming a move before it is played', () => {
  it('holds the move instead of playing it, and says which move it is holding', () => {
    const onMove = vi.fn()
    show(PAWN_GAME(), onMove)

    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e4')))

    expect(onMove).not.toHaveBeenCalled()
    // Naming the move is the point: confirming "a move" is not confirming anything.
    expect(screen.getByTestId(SUBMIT_BAR_TESTID).textContent).toContain('e2–e4')
    expect(screen.getByTestId(HELD_TESTID)).toBeTruthy()
  })

  it('plays it when Submit is pressed', () => {
    const onMove = vi.fn()
    show(PAWN_GAME(), onMove)

    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e4')))
    fireEvent.click(screen.getByTestId(SUBMIT_MOVE_TESTID))

    expect(onMove).toHaveBeenCalledTimes(1)
    const played = onMove.mock.calls[0]![0] as Move
    expect(`${algebraic(played.from)}${algebraic(played.to)}`).toBe('e2e4')
  })

  it('forgets it when Cancel is pressed, and the board is usable again', () => {
    const onMove = vi.fn()
    show(PAWN_GAME(), onMove)

    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e4')))
    fireEvent.click(screen.getByTestId(CANCEL_MOVE_TESTID))

    expect(onMove).not.toHaveBeenCalled()
    expect(screen.queryByTestId(SUBMIT_BAR_TESTID)).toBeNull()

    // ...and a different move can now be chosen.
    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e3')))
    expect(screen.getByTestId(SUBMIT_BAR_TESTID).textContent).toContain('e2–e3')
  })

  it('ignores taps on the board while a move is waiting, so the button cannot lie', () => {
    // If a tap could quietly re-target, "Submit move" would commit something other than
    // what the bar names.
    const onMove = vi.fn()
    show(PAWN_GAME(), onMove)

    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e4')))
    fireEvent.click(screen.getByTestId(squareTestId('e1')))   // try to select the king
    fireEvent.click(screen.getByTestId(squareTestId('a1')))   // ...and an empty square

    expect(screen.getByTestId(SUBMIT_BAR_TESTID).textContent).toContain('e2–e4')
    fireEvent.click(screen.getByTestId(SUBMIT_MOVE_TESTID))
    const played = onMove.mock.calls[0]![0] as Move
    expect(`${algebraic(played.from)}${algebraic(played.to)}`).toBe('e2e4')
  })

  it('asks which piece first when promoting, then still waits for Submit', () => {
    // Choosing a queen says *which* move, not that it should be played. With confirm on,
    // the player keeps the last word.
    const onMove = vi.fn()
    const s = fromPiecesSpec('w:Ke1,Pb7; b:Ke8,Pa2', 'white', RULES_ALL_ON)
    show(s, onMove)

    fireEvent.click(screen.getByTestId(squareTestId('b7')))
    fireEvent.click(screen.getByTestId(hintTestId('b8')))
    expect(screen.getByTestId(PROMOTION_DIALOG_TESTID)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /queen/i }))

    expect(onMove).not.toHaveBeenCalled()
    expect(screen.getByTestId(SUBMIT_BAR_TESTID).textContent).toContain('=Q')

    fireEvent.click(screen.getByTestId(SUBMIT_MOVE_TESTID))
    expect((onMove.mock.calls[0]![0] as Move).promotion).toBe('Q')
  })

  it('marks a seam crossing in the bar, so you confirm the move you think you chose', () => {
    // A crossing is the one move whose destination is surprising, which makes it the one
    // most worth naming before it is played.
    const s = fromPiecesSpec('w:Ke1,Bb3; b:Ke8,Pa7', 'white', RULES_ALL_ON)
    show(s)

    fireEvent.click(screen.getByTestId(squareTestId('b3')))
    fireEvent.click(screen.getByTestId(hintTestId('h5')))

    expect(screen.getByTestId(SUBMIT_BAR_TESTID).textContent).toContain('b3–h5*')
  })

  it('announces the bar, because it appears in response to a tap', () => {
    show(PAWN_GAME())

    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e4')))

    const bar = screen.getByTestId(SUBMIT_BAR_TESTID)
    expect(bar.getAttribute('role')).toBe('status')
    expect(bar.getAttribute('aria-live')).toBe('polite')
  })

  it('still plays immediately when auto-submit is on', () => {
    // The control: the default behaviour must be untouched by all of the above.
    const onMove = vi.fn()
    show(PAWN_GAME(), onMove, true)

    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    fireEvent.click(screen.getByTestId(hintTestId('e4')))

    expect(onMove).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId(SUBMIT_BAR_TESTID)).toBeNull()
  })
})
