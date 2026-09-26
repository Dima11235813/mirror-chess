import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

/**
 * Bishop hints in the real UI, per `prj-mgmt/epics/rules/mirror-portal-spec.md` §5.2.
 */
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

  test('Mirror move: Bc1 portals left through a3 to h3,g4,f5,e6,d7,c8', async ({ page }) => {
    const spec = 'w:Bc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['h3', 'g4', 'f5', 'e6', 'd7', 'c8']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // The hop preserves rank: leaving via a3 emerges on h3, never h4.
    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(0)
  })

  test('Mirror move: Bc1 portals right through h6 to a6,b7', async ({ page }) => {
    const spec = 'w:Bc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['a6', 'b7']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // a7 is the cylinder-wrap answer — the seam hop must not advance the rank.
    await expect(page.getByTestId(hintTestId('a7'))).toHaveCount(0)
  })

  test('Mirror attack: Bc1 captures an enemy on the far side of the seam and stops there', async ({ page }) => {
    const spec = 'w:Bc1; b:Na6'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    await expect(page.getByTestId(hintTestId('a6'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('b7'))).toHaveCount(0)
  })
})
