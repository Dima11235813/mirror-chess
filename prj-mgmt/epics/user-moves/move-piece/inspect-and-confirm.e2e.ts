import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import {
  squareTestId,
  hintTestId,
  HINT_TESTID_PREFIX,
  SUBMIT_BAR_TESTID,
  SUBMIT_MOVE_TESTID,
  CANCEL_MOVE_TESTID,
  SETTINGS_OPEN_TESTID,
  SETTINGS_DIALOG_TESTID,
  SETTINGS_AUTOSUBMIT_TESTID,
  SETTINGS_RESET_TESTID,
  SETTINGS_CLOSE_TESTID,
  GAME_STATUS_TESTID,
} from '@shared/ui/selectors'

/**
 * Two features the owner asked for on 2026-10-09, in the real app.
 * Stories: [`select-piece.md`](./select-piece.md) and [`submit-move.md`](./submit-move.md).
 */
const hints = (page: import('@playwright/test').Page) =>
  page.locator(`[data-testid^="${HINT_TESTID_PREFIX}"]`)

const openSettings = async (page: import('@playwright/test').Page) => {
  await page.getByTestId(SETTINGS_OPEN_TESTID).click()
  await expect(page.getByTestId(SETTINGS_DIALOG_TESTID)).toBeVisible()
}

test.describe('mirror-chess: previewing a piece you cannot move', () => {
  test('tapping an enemy piece shows what it could do, greyed out', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white'))

    await page.getByTestId(squareTestId('b8')).click()

    await expect(page.getByTestId(hintTestId('a6'))).toHaveClass(/preview/)
    await expect(page.getByTestId(squareTestId('a6')))
      .toHaveAttribute('aria-label', /could move here/)
  })

  test('tapping a previewed square moves nothing', async ({ page }) => {
    // The one thing that must never happen: an enemy piece playing a move.
    await page.goto(urlForSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white'))

    await page.getByTestId(squareTestId('b8')).click()
    await page.getByTestId(hintTestId('a6')).click()

    await expect(page.getByTestId(squareTestId('b8'))).toContainText('♞')
    await expect(page.getByTestId(squareTestId('a6'))).not.toContainText('♞')
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white')
    await expect(hints(page)).toHaveCount(0)
  })

  test('your own pieces still move, and are not greyed', async ({ page }) => {
    // The control. Without it, a board that previewed *everything* would pass above.
    await page.goto(urlForSpec('w:Ke1,Pe2; b:Ke8,Nb8', 'white'))

    await page.getByTestId(squareTestId('e2')).click()
    await expect(page.getByTestId(hintTestId('e4'))).not.toHaveClass(/preview/)

    await page.getByTestId(squareTestId('e4')).click()
    await expect(page.getByTestId(squareTestId('e4'))).toContainText('♙')
  })
})

test.describe('mirror-chess: confirming a move before it is played', () => {
  test('the gear opens settings, and the toggle survives a reload', async ({ page }) => {
    await page.goto('/')
    await openSettings(page)

    await page.getByTestId(SETTINGS_AUTOSUBMIT_TESTID).uncheck()
    await page.getByTestId(SETTINGS_CLOSE_TESTID).click()

    await page.reload()
    await openSettings(page)
    await expect(page.getByTestId(SETTINGS_AUTOSUBMIT_TESTID)).not.toBeChecked()

    // ...and Reset puts it back, so a confused player has a way out.
    await page.getByTestId(SETTINGS_RESET_TESTID).click()
    await expect(page.getByTestId(SETTINGS_AUTOSUBMIT_TESTID)).toBeChecked()
  })

  test('a move waits for Submit, and the bar names it', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Bb3; b:Ke8,Pa7', 'white'))
    await openSettings(page)
    await page.getByTestId(SETTINGS_AUTOSUBMIT_TESTID).uncheck()
    await page.getByTestId(SETTINGS_CLOSE_TESTID).click()

    await page.getByTestId(squareTestId('b3')).click()
    await page.getByTestId(hintTestId('h5')).click()

    // Nothing has moved yet, and the bar says which move is waiting - including the seam
    // marker, since a crossing is the move whose destination is most surprising.
    await expect(page.getByTestId(squareTestId('b3'))).toContainText('♗')
    await expect(page.getByTestId(SUBMIT_BAR_TESTID)).toContainText('b3–h5*')

    await page.getByTestId(SUBMIT_MOVE_TESTID).click()

    await expect(page.getByTestId(squareTestId('h5'))).toContainText('♗')
    await expect(page.getByTestId(squareTestId('b3'))).not.toContainText('♗')
    await expect(page.getByTestId(SUBMIT_BAR_TESTID)).toHaveCount(0)
  })

  test('Cancel puts the move back', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Pe2; b:Ke8,Pa7', 'white'))
    await openSettings(page)
    await page.getByTestId(SETTINGS_AUTOSUBMIT_TESTID).uncheck()
    await page.getByTestId(SETTINGS_CLOSE_TESTID).click()

    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(hintTestId('e4')).click()
    await page.getByTestId(CANCEL_MOVE_TESTID).click()

    await expect(page.getByTestId(SUBMIT_BAR_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(squareTestId('e2'))).toContainText('♙')
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white')
  })

  test('with the setting on, a move still plays immediately', async ({ page }) => {
    // The default path, which must be untouched by any of this.
    await page.goto(urlForSpec('w:Ke1,Pe2; b:Ke8,Pa7', 'white'))

    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(hintTestId('e4')).click()

    await expect(page.getByTestId(squareTestId('e4'))).toContainText('♙')
    await expect(page.getByTestId(SUBMIT_BAR_TESTID)).toHaveCount(0)
  })
})
