import { test, expect } from '@playwright/test'
import {
  WATCH_SCREEN_TESTID,
  WATCH_MODE_TESTID,
  WATCH_PLAY_TESTID,
  WATCH_STEP_TESTID,
  WATCH_RESET_TESTID,
  WATCH_STATUS_TESTID,
  WATCH_LOG_TESTID,
  WATCH_GAUGE_TESTID,
  GAME_STATUS_TESTID,
  squareTestId,
} from '@shared/ui/selectors'

/**
 * Two engines playing, in the real app with the real Web Worker.
 * Story: [`watch-a-game.md`](./watch-a-game.md).
 *
 * The integration tests drive the screen with an injected engine; these prove the *worker*
 * path works end to end — that a real search returns, the move reaches the board, and the
 * page stayed responsive enough to click Pause.
 */
const rows = (page: import('@playwright/test').Page) =>
  page.locator(`[data-testid="${WATCH_LOG_TESTID}"] li`)

test.describe('mirror-chess: watching two engines play', () => {
  test('the header opens watch mode and goes back to the game', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId(WATCH_SCREEN_TESTID)).toHaveCount(0)

    await page.getByTestId(WATCH_MODE_TESTID).click()
    await expect(page.getByTestId(WATCH_SCREEN_TESTID)).toBeVisible()
    // The game's own status line is gone: watch mode replaces the board, as puzzles do.
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveCount(0)

    await page.getByTestId(WATCH_MODE_TESTID).click()
    await expect(page.getByTestId(WATCH_SCREEN_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toBeVisible()
  })

  test('a link opens it directly, paused, with the starting position', async ({ page }) => {
    await page.goto('/?mode=watch')

    await expect(page.getByTestId(WATCH_SCREEN_TESTID)).toBeVisible()
    await expect(page.getByTestId(WATCH_PLAY_TESTID)).toHaveText(/Play/)
    await expect(rows(page)).toHaveCount(0)
    await expect(page.getByTestId(squareTestId('e2'))).toContainText('♙')
  })

  test('the gauge names the engine\'s indifference, which is why this screen exists', async ({ page }) => {
    await page.goto('/?mode=watch')

    // 20 legal moves at the start, and a material-only evaluation cannot separate any of
    // them. When this number falls, the evaluation work has landed.
    await expect(page.getByTestId(WATCH_GAUGE_TESTID))
      .toContainText('20 of 20 moves indistinguishable')
  })

  test('step plays one real move through the worker, and it lands on the board', async ({ page }) => {
    await page.goto('/?mode=watch')
    await page.getByTestId(WATCH_STEP_TESTID).click()

    await expect(rows(page)).toHaveCount(1, { timeout: 30_000 })
    const row = (await rows(page).first().textContent()) ?? ''
    const match = row.match(/([a-h][1-8])-([a-h][1-8])/)
    expect(match, `no move in "${row}"`).not.toBeNull()

    // The square it came from is empty of pieces. Not `toBeEmpty()`: the board draws file
    // and rank labels inside the edge squares, so `b1` reads as "B" either way.
    const [, from, to] = match!
    await expect(page.getByTestId(squareTestId(to!))).toHaveText(/[♔-♟]/)
    await expect(page.getByTestId(squareTestId(from!))).not.toHaveText(/[♔-♟]/)
  })

  test('play runs a game on, and pause stops it', async ({ page }) => {
    await page.goto('/?mode=watch')
    await page.getByTestId(WATCH_PLAY_TESTID).click()

    await expect(rows(page).nth(2)).toBeVisible({ timeout: 60_000 })
    await page.getByTestId(WATCH_PLAY_TESTID).click()
    await expect(page.getByTestId(WATCH_PLAY_TESTID)).toHaveText(/Play/)

    // One search may already be in flight when Pause lands; nothing beyond it may start.
    const settled = await rows(page).count()
    await page.waitForTimeout(2_000)
    expect(await rows(page).count()).toBeLessThanOrEqual(settled + 1)
  })

  test('reset returns to the starting position and clears the log', async ({ page }) => {
    await page.goto('/?mode=watch')
    await page.getByTestId(WATCH_STEP_TESTID).click()
    await expect(rows(page)).toHaveCount(1, { timeout: 30_000 })

    await page.getByTestId(WATCH_RESET_TESTID).click()

    await expect(rows(page)).toHaveCount(0)
    await expect(page.getByTestId(squareTestId('b1'))).toContainText('♘')
  })

  test('status is a live region, so a screen reader hears the game progress', async ({ page }) => {
    await page.goto('/?mode=watch')

    await expect(page.getByTestId(WATCH_STATUS_TESTID)).toHaveAttribute('aria-live', 'polite')
    await expect(page.getByTestId(WATCH_STATUS_TESTID)).toHaveAttribute('role', 'status')
  })

  test('game-only controls are hidden, because they would act on something unseen', async ({ page }) => {
    // Shipped visible on 2026-10-04 and caught in a screenshot: the condition was written
    // as "not puzzle mode", which stopped meaning "the game screen" the moment a third
    // screen existed.
    await page.goto('/?mode=watch')

    const header = page.locator('ion-toolbar .actions')
    await expect(header.getByRole('button', { name: 'Reset', exact: true })).toHaveCount(0)
    await expect(header.getByRole('button', { name: /Save Game/i })).toHaveCount(0)
    // The watch screen's own Reset is still there - it resets the game being watched, and
    // it lives outside the header for exactly this reason.
    await expect(page.getByTestId(WATCH_RESET_TESTID)).toBeVisible()
  })
})
