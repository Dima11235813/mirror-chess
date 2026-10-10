import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BoardView } from './BoardView'
import { fromPiecesSpec } from '@game/setup'
import { gameStatus } from '@game/status'
import { RULES_ALL_ON } from '@game/rules'
import { hintTestId, squareTestId, MOVE_MESSAGE_TESTID, SquareHintClass } from '@shared/ui/selectors'
import type { GameState } from '@game/types'

/**
 * Tapping a piece you cannot play shows what it *could* do.
 * Story: `prj-mgmt/epics/user-moves/move-piece/select-piece.md`.
 *
 * That story used to say the opposite — "an opponent's piece should not be highlighted or
 * selectable" — and the owner asked for the reverse on 2026-10-09. The criterion is
 * amended there rather than silently contradicted here.
 */
const show = (state: GameState) =>
  render(<BoardView state={state} status={gameStatus(state)} onMove={() => {}} />)

const hints = () => Array.from(document.querySelectorAll(`[data-testid^="hint-"]`))

describe('BoardView — previewing a piece that is not yours to move', () => {
  it('shows an enemy knight\'s moves when it is not their turn', () => {
    // White to move; tap black's knight on b8.
    const s = fromPiecesSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white', RULES_ALL_ON)
    show(s)

    fireEvent.click(screen.getByTestId(squareTestId('b8')))

    // a6 and c6 are the ordinary L-moves; the seam gives it g6 and h7 as well.
    for (const sq of ['a6', 'c6']) {
      expect(screen.getByTestId(hintTestId(sq)), `${sq} should be previewed`).toBeTruthy()
    }
    expect(hints().length).toBeGreaterThan(2)
  })

  it('marks a preview differently from a move you can play, in class and in words', () => {
    // The whole risk of this feature is a player tapping a grey ring and expecting a move.
    const s = fromPiecesSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white', RULES_ALL_ON)
    show(s)

    fireEvent.click(screen.getByTestId(squareTestId('b8')))
    expect(screen.getByTestId(hintTestId('a6')).className).toContain(SquareHintClass.Preview)
    expect(screen.getByTestId(squareTestId('a6')).getAttribute('aria-label'))
      .toContain('could move here')

    // ...and the same square, reached by a piece that *is* yours, says "legal move".
    fireEvent.click(screen.getByTestId(squareTestId('e2')))
    expect(screen.getByTestId(hintTestId('e4')).className).not.toContain(SquareHintClass.Preview)
    expect(screen.getByTestId(squareTestId('e4')).getAttribute('aria-label'))
      .toContain('legal move')
  })

  it('says in the message that the piece is not yours to play', () => {
    const s = fromPiecesSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white', RULES_ALL_ON)
    show(s)

    fireEvent.click(screen.getByTestId(squareTestId('b8')))

    expect(screen.getByTestId(MOVE_MESSAGE_TESTID).textContent).toContain('cannot play it')
    // ...and it reads as information, not as a refusal. Both kinds of text share this
    // line, and a screenshot showed the informational one rendered in warning red.
    expect(screen.getByTestId(MOVE_MESSAGE_TESTID).className).toContain('info')
  })

  it('does NOT move the enemy piece when a previewed square is tapped', () => {
    // The one thing that must never happen.
    let moved = 0
    const s = fromPiecesSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white', RULES_ALL_ON)
    render(<BoardView state={s} status={gameStatus(s)} onMove={() => { moved++ }} />)

    fireEvent.click(screen.getByTestId(squareTestId('b8')))
    fireEvent.click(screen.getByTestId(hintTestId('a6')))

    expect(moved).toBe(0)
    expect(hints()).toHaveLength(0)      // the tap cleared the preview
  })

  it('never offers an en passant capture to the side that just moved', () => {
    // The probe that justified `previewMovesFor`: black has just played e7-e5, so the
    // en-passant square e6 belongs to WHITE. Previewing black's d7 pawn must not offer
    // e6 — that would capture black's own pawn, and `legalMovesFor` does not check turn.
    const base = fromPiecesSpec('w:Ke1,Pd5,Pf5; b:Ke8,Pd7', 'white', RULES_ALL_ON)
    const withEp: GameState = { ...base, enPassant: { f: 4, r: 5 } } // e6
    show(withEp)

    fireEvent.click(screen.getByTestId(squareTestId('d7')))

    expect(screen.queryByTestId(hintTestId('e6'))).toBeNull()
    expect(screen.getByTestId(hintTestId('d6'))).toBeTruthy()  // its ordinary push still shows
  })

  it('offers nothing at all for YOUR piece in a drawn game, preview included', () => {
    // Preview is about **whose** piece it is, not about whether the board is live. The
    // first cut of this feature previewed anything unplayable, which broke two older
    // guarantees: `draw-rules.e2e.ts` asserts a drawn game offers no hints when you tap
    // your own king, and `opponent.e2e.ts` asserts the same while the engine thinks. A
    // player must never be shown markers on a piece they are reaching for.
    const drawn = fromPiecesSpec('w:Ke1,Bc1; b:Ke8', 'white', RULES_ALL_ON) // insufficient material
    show(drawn)

    fireEvent.click(screen.getByTestId(squareTestId('c1')))

    expect(hints()).toHaveLength(0)
    expect(screen.getByTestId(MOVE_MESSAGE_TESTID).textContent).toBe('')
  })

  it('still previews the opposing piece in that same drawn game', () => {
    // The control for the test above: the board is not simply inert.
    const drawn = fromPiecesSpec('w:Ke1,Bc1; b:Ke8', 'white', RULES_ALL_ON)
    show(drawn)

    fireEvent.click(screen.getByTestId(squareTestId('e8')))

    // Not a hand-picked square: `d8` looks obvious and is wrong, because the white bishop
    // on c1 attacks it *through the seam* (c1 → b2, a3 | h4, g5, f6, e7, d8), so king
    // safety removes it. Preview runs the same legality filter as a real move would.
    expect(hints().length).toBeGreaterThan(0)
    for (const hint of hints()) expect(hint.className).toContain(SquareHintClass.Preview)
    expect(screen.queryByTestId(hintTestId('d8'))).toBeNull()
  })
})
