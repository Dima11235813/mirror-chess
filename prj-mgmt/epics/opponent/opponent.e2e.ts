import { test, expect, type Page } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import {
  ENGINE_STATUS_TESTID,
  GAME_STATUS_TESTID,
  OPPONENT_DIFFICULTY_TESTID,
  OPPONENT_SIDE_TESTID,
  hintTestId,
  squareTestId,
} from '@shared/ui/selectors'
import { TOKEN_STANDARD_CHESS } from '@game/rules'

/**
 * Playing against the engine, in the real browser.
 * Oracle: `prj-mgmt/epics/opponent/opponent-integration.md`.
 *
 * These are the tests that cannot be written at any lower level, because what they check is
 * *timing*: that the page stays alive while a background thread is busy, that a move
 * arriving late is not applied to a board that has moved on, and that the player cannot
 * move for their opponent. All three are races, and all three are invisible to a unit test.
 */

const play = async (page: Page, from: string, to: string) => {
  await page.getByTestId(squareTestId(from)).click()
  await page.getByTestId(squareTestId(to)).click()
}

/** The engine plays Black on a quick level, from a small position so it answers fast. */
const vsEngine = (spec: string, turn: 'white' | 'black' = 'white') =>
  `${urlForSpec(spec, turn, TOKEN_STANDARD_CHESS)}&engine=black&level=gentle`

test.describe('mirror-chess: playing the engine', () => {
  test('the engine replies to a move, and the game continues', async ({ page }) => {
    await page.goto(vsEngine('w:Ke1,Ra1,Pd2; b:Ke8,Rh8,Pe7'))
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white')

    await play(page, 'd2', 'd4')

    // Black is the engine: it thinks, then plays, and the turn comes back to White.
    // `toContainText`, not `toHaveText` — the engine finds Rh1+ here, which drives the
    // king off the back rank and wins the undefended rook next move (White's own king
    // blocks Ra1 from ever defending h1). A good move, and the footer says "— check".
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toContainText('Turn: white', { timeout: 15_000 })
    await expect(page.getByTestId(ENGINE_STATUS_TESTID)).toHaveText('')
  })

  test('finds a two-move tactic even on the gentlest level, thanks to quiescence', async ({ page }) => {
    // Rh1+ scores +500 at every depth from 1 upward: the check forces the king off rank 1,
    // and quiescence sees Rxa1 follow. Without quiescence this is invisible at depth 1.
    await page.goto(vsEngine('w:Ke1,Ra1,Pd2; b:Ke8,Rh8,Pe7'))
    await play(page, 'd2', 'd4')

    await expect(page.getByTestId(squareTestId('h1'))).toContainText('♜', { timeout: 15_000 })
  })

  test('announces that it is thinking, for a screen reader as well as an eye', async ({ page }) => {
    // A deeper level so the "thinking" state is observable rather than instantaneous.
    await page.goto(`${urlForSpec('w:Ke1,Qd1,Ra1,Nb1,Pd2,Pe2; b:Ke8,Qd8,Rh8,Nb8,Pd7,Pe7', 'white', TOKEN_STANDARD_CHESS)}&engine=black&level=sharp`)

    const engineStatus = page.getByTestId(ENGINE_STATUS_TESTID)
    await expect(engineStatus).toHaveAttribute('role', 'status')
    await expect(engineStatus).toHaveAttribute('aria-live', 'polite')

    await play(page, 'e2', 'e4')
    await expect(engineStatus).toContainText('Thinking', { timeout: 10_000 })
    await expect(engineStatus).toHaveText('', { timeout: 30_000 })
  })

  test('the player cannot move for the engine while it thinks', async ({ page }) => {
    await page.goto(`${urlForSpec('w:Ke1,Qd1,Ra1,Nb1,Pd2,Pe2; b:Ke8,Qd8,Rh8,Nb8,Pd7,Pe7', 'white', TOKEN_STANDARD_CHESS)}&engine=black&level=sharp`)

    await play(page, 'e2', 'e4')
    await expect(page.getByTestId(ENGINE_STATUS_TESTID)).toContainText('Thinking', { timeout: 10_000 })

    // Selecting a black piece must offer nothing: the board belongs to the engine.
    await page.getByTestId(squareTestId('d7')).click()
    await expect(page.locator('[data-testid^="hint-"]')).toHaveCount(0)
  })

  test('the page stays responsive while the engine thinks — the whole point of the worker', async ({ page }) => {
    await page.goto(`${urlForSpec('w:Ke1,Qd1,Ra1,Nb1,Pd2,Pe2; b:Ke8,Qd8,Rh8,Nb8,Pd7,Pe7', 'white', TOKEN_STANDARD_CHESS)}&engine=black&level=sharp`)

    await play(page, 'e2', 'e4')
    await expect(page.getByTestId(ENGINE_STATUS_TESTID)).toContainText('Thinking', { timeout: 10_000 })

    // If the search were on the main thread, this would block until it finished.
    const started = Date.now()
    await page.getByTestId(OPPONENT_SIDE_TESTID).click()
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  test('switching to two players stops the engine and hands the board back', async ({ page }) => {
    await page.goto(`${urlForSpec('w:Ke1,Qd1,Ra1,Nb1,Pd2,Pe2; b:Ke8,Qd8,Rh8,Nb8,Pd7,Pe7', 'white', TOKEN_STANDARD_CHESS)}&engine=black&level=sharp`)

    await play(page, 'e2', 'e4')
    await expect(page.getByTestId(ENGINE_STATUS_TESTID)).toContainText('Thinking', { timeout: 10_000 })

    await page.getByTestId(OPPONENT_SIDE_TESTID).selectOption('none')
    await expect(page.getByTestId(ENGINE_STATUS_TESTID)).toHaveText('')

    // The board is Black's again, and a human may now move it.
    await page.getByTestId(squareTestId('d7')).click()
    await expect(page.getByTestId(hintTestId('d5'))).toHaveCount(1)
  })

  test('offers three strengths, and only once an engine is playing', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Pd2; b:Ke8,Pe7', 'white', TOKEN_STANDARD_CHESS))

    // Two players: no strength control to confuse anyone.
    await expect(page.getByTestId(OPPONENT_DIFFICULTY_TESTID)).toHaveCount(0)

    await page.getByTestId(OPPONENT_SIDE_TESTID).selectOption('black')
    const difficulty = page.getByTestId(OPPONENT_DIFFICULTY_TESTID)
    await expect(difficulty).toHaveCount(1)
    await expect(difficulty.locator('option')).toHaveText(['Gentle', 'Steady', 'Sharp'])
  })

  test('takes a free queen, so it is demonstrably playing rather than shuffling', async ({ page }) => {
    // Black to move, engine plays Black, and White's queen is hanging on a5.
    await page.goto(`${urlForSpec('w:Ke1,Qa5; b:Ke8,Ra8', 'black', TOKEN_STANDARD_CHESS)}&engine=black&level=gentle`)

    await expect(page.getByTestId(squareTestId('a5'))).toContainText('♜', { timeout: 15_000 })
  })
})
