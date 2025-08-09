import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

test.describe('mirror-chess: bishop moves', () => {
  test('Regular move: Bc1 on empty board highlights all diagonals (d2,e3,f4,g5,h6,b2,a3)', async ({ page }) => {
    const spec = 'w:Bc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['d2', 'e3', 'f4', 'g5', 'h6', 'b2', 'a3']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
  })

  test('Regular attack: Bc1 captures e3 and stops beyond (no f4,g5,h6)', async ({ page }) => {
    const spec = 'w:Bc1; b:Pe3'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['d2', 'e3', 'b2', 'a3']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    for (const sq of ['f4', 'g5', 'h6', 'f1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }
  })

  test('Mirror move (diagonal portal): Bc1 highlights seam-wrapped h4 on empty board', async ({ page }) => {
    const spec = 'w:Bc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(1)
  })

  test('Mirror attack (diagonal portal): Bc1 can capture enemy on seam-wrapped landing', async ({ page }) => {
    // Place a black piece on h4; diagonal path must be clear on side path
    const spec = 'w:Bc1; b:Nh4'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(1)
  })
})


