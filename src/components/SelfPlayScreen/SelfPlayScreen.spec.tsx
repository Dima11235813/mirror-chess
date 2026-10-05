import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SelfPlayScreen } from './SelfPlayScreen'
import { fakeEngine, brokenEngine } from './SelfPlayScreen.mocks'
import { RULES_ALL_ON } from '@game/rules'
import {
  WATCH_SCREEN_TESTID,
  WATCH_PLAY_TESTID,
  WATCH_STEP_TESTID,
  WATCH_RESET_TESTID,
  WATCH_STATUS_TESTID,
  WATCH_LOG_TESTID,
  WATCH_GAUGE_TESTID,
  squareTestId,
} from '@shared/ui/selectors'

/**
 * Story: `prj-mgmt/epics/balance/watch-a-game.md`.
 *
 * The engine is injected (`SelfPlayScreen.mocks.ts`) and plays real legal moves, so these
 * drive the screen deterministically without a `Worker` — which jsdom does not have.
 */
const rows = () => screen.getByTestId(WATCH_LOG_TESTID).querySelectorAll('li')

/**
 * The chess glyph on a square, ignoring the coordinate label drawn inside edge squares.
 *
 * Asserting on `textContent` directly reads `b1` as "B" whether or not a piece is there,
 * which has now fooled a test twice — here, and in `PuzzleScreen.spec.tsx`. The labels are
 * `aria-hidden` decoration; the glyph is the content.
 */
const pieceOn = (square: string): string =>
  (screen.getByTestId(squareTestId(square)).textContent ?? '').replace(/[^♔-♟]/g, '')

const renderScreen = (props: Partial<Parameters<typeof SelfPlayScreen>[0]> = {}) =>
  render(
    <SelfPlayScreen
      rules={RULES_ALL_ON}
      difficulty="gentle"
      think={fakeEngine()}
      {...props}
    />,
  )

describe('SelfPlayScreen', () => {
  it('opens paused, with the starting position and an empty log', () => {
    // A screen that starts working unasked is rude, and it also makes every other test
    // here racy.
    renderScreen()

    expect(screen.getByTestId(WATCH_SCREEN_TESTID)).toBeTruthy()
    expect(screen.getByTestId(WATCH_PLAY_TESTID).textContent).toContain('Play')
    expect(rows()).toHaveLength(0)
    expect(screen.getByTestId(squareTestId('e2')).textContent).toContain('♙')
  })

  it('shows the indifference gauge, which is the point of the screen', () => {
    // 20 of 20 at the start position, measured 2026-10-04: the evaluation is material-only,
    // so it has no preference between any opening move. When this number falls, the
    // evaluation has started working.
    renderScreen()

    expect(screen.getByTestId(WATCH_GAUGE_TESTID).textContent)
      .toContain('20 of 20 moves indistinguishable')
  })

  it('plays exactly one move per step, and records the engine\'s reasoning', async () => {
    renderScreen()

    fireEvent.click(screen.getByTestId(WATCH_STEP_TESTID))

    await waitFor(() => expect(rows()).toHaveLength(1))
    const first = rows()[0]!.textContent ?? ''
    expect(first).toMatch(/[a-h][1-8]-[a-h][1-8]/)   // the move
    expect(first).toContain('depth 2')               // how deep it got
    expect(first).toContain('1,234 nodes')           // what it cost
    expect(first).toContain('/20 tied')              // what it could not tell apart

    // ...and exactly one. A step that quietly started the loop would keep going.
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(rows()).toHaveLength(1)
  })

  it('moves the piece on the board, not only in the log', async () => {
    // The lesson from the puzzle screen, which described a journey the board never made:
    // assert on the board, not just on the text beside it.
    renderScreen()

    fireEvent.click(screen.getByTestId(WATCH_STEP_TESTID))
    await waitFor(() => expect(rows()).toHaveLength(1))

    const moved = rows()[0]!.textContent ?? ''
    const [from, to] = moved.match(/([a-h][1-8])-([a-h][1-8])/)!.slice(1)
    const glyph = pieceOn(to!)

    expect(glyph).not.toBe('')          // something arrived
    expect(pieceOn(from!)).toBe('')     // ...and it left where it came from
  })

  it('keeps playing while running, and stops when paused', async () => {
    renderScreen()

    fireEvent.click(screen.getByTestId(WATCH_PLAY_TESTID))
    await waitFor(() => expect(rows().length).toBeGreaterThan(2))
    expect(screen.getByTestId(WATCH_PLAY_TESTID).textContent).toContain('Pause')

    fireEvent.click(screen.getByTestId(WATCH_PLAY_TESTID))
    await waitFor(() => expect(screen.getByTestId(WATCH_PLAY_TESTID).textContent).toContain('Play'))
    const settled = rows().length

    await new Promise(resolve => setTimeout(resolve, 40))
    // A search already in flight may land after the pause; it must not start another.
    expect(rows().length).toBeLessThanOrEqual(settled + 1)
  })

  it('resets to the starting position and forgets the game', async () => {
    renderScreen()

    fireEvent.click(screen.getByTestId(WATCH_STEP_TESTID))
    await waitFor(() => expect(rows()).toHaveLength(1))

    fireEvent.click(screen.getByTestId(WATCH_RESET_TESTID))

    expect(rows()).toHaveLength(0)
    expect(screen.getByTestId(squareTestId('e2')).textContent).toContain('♙')
    expect(screen.getByTestId(WATCH_PLAY_TESTID).textContent).toContain('Play')
  })

  it('announces status in a live region, so progress is not silent', () => {
    renderScreen()
    const status = screen.getByTestId(WATCH_STATUS_TESTID)

    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.getAttribute('role')).toBe('status')
  })

  it('reports an engine failure instead of hanging silently', async () => {
    renderScreen({ think: brokenEngine('worker exploded') })

    fireEvent.click(screen.getByTestId(WATCH_STEP_TESTID))

    await waitFor(() =>
      expect(screen.getByTestId(WATCH_STATUS_TESTID).textContent).toContain('worker exploded'))
    expect(rows()).toHaveLength(0)
  })

  it('plays a whole game to its end and then stops offering to play', async () => {
    // The fake engine always takes the first legal move, which reaches a draw rather than
    // wandering forever. This proves the screen notices the game is over - a loop that
    // kept asking a finished position for moves would spin.
    renderScreen({ think: fakeEngine() })

    fireEvent.click(screen.getByTestId(WATCH_PLAY_TESTID))

    await waitFor(
      () => expect(screen.getByTestId(WATCH_PLAY_TESTID).getAttribute('disabled')).not.toBeNull(),
      { timeout: 20_000 },
    )
    expect(screen.getByTestId(WATCH_STATUS_TESTID).textContent).toMatch(/Draw|Checkmate|Stalemate/)
  }, 30_000)
})
