import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { hintTestId, squareTestId } from '@shared/ui/selectors'

/**
 * A variant travels in a link.
 * Story: `prj-mgmt/epics/balance/rule-flags.md`; identity per ADR 0004.
 */
test.describe('mirror-chess: rule flags in the URL', () => {
  test('the default ruleset lets a bishop cross the seam', async ({ page }) => {
    await page.goto(urlForSpec('w:Bb3', 'white'))

    await page.getByTestId(squareTestId('b3')).click()

    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)
  })

  test('------ is ordinary chess: the same bishop stays on its own side', async ({ page }) => {
    await page.goto(urlForSpec('w:Bb3', 'white', '------'))

    await page.getByTestId(squareTestId('b3')).click()

    // Ordinary diagonals remain; every seam crossing is gone.
    await expect(page.getByTestId(hintTestId('a4'))).toHaveCount(1)
    for (const sq of ['h5', 'g6', 'e8', 'h1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }
  })

  test('BRQ--- lets sliders cross but leaves the knight standard', async ({ page }) => {
    await page.goto(urlForSpec('w:Bb3,Na3', 'white', 'BRQ---'))

    await page.getByTestId(squareTestId('b3')).click()
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)

    await page.getByTestId(squareTestId('a3')).click()
    // The knight's wrapped L-moves are switched off under this ruleset.
    for (const sq of ['h5', 'g4', 'g2', 'h1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }
    await expect(page.getByTestId(hintTestId('b5'))).toHaveCount(1)
  })

  test('a registered alias works in place of the token', async ({ page }) => {
    await page.goto(urlForSpec('w:Na3', 'white', 'standard'))

    await page.getByTestId(squareTestId('a3')).click()

    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('b5'))).toHaveCount(1)
  })

  test('an unrecognisable ruleset falls back to the default instead of breaking', async ({ page }) => {
    await page.goto(urlForSpec('w:Bb3', 'white', 'QRB---'))

    await page.getByTestId(squareTestId('b3')).click()

    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)
  })
})
