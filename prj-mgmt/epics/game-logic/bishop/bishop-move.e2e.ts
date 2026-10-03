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

  test('Regular attack: Bc1 captures e3, and the seam reaches behind the blocker', async ({ page }) => {
    const spec = 'w:Bc1; b:Pe3'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['d2', 'e3', 'b2', 'a3']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // The north-east ray stops on the capture, so f4 and h6 are gone.
    for (const sq of ['f4', 'h6', 'f1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }
    // But g5 is still offered — reached the *other* way, by the north-west ray crossing
    // the seam at a3 and continuing h4, g5. Getting behind a blocker is the whole point of
    // the seam, and under the old rank-preserving crossing this square was unreachable.
    await expect(page.getByTestId(hintTestId('g5'))).toHaveCount(1)
  })

  test('Mirror move: Bc1 crosses left at a3 and continues h4,g5,f6,e7,d8', async ({ page }) => {
    const spec = 'w:Bc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['b2', 'a3', 'h4', 'g5', 'f6', 'e7', 'd8']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // The crossing advances the rank, so the ray keeps c1's dark squares: h4, never h3.
    await expect(page.getByTestId(hintTestId('h3'))).toHaveCount(0)
  })

  test('Mirror move: Bc1 crosses right at h6 and continues a7,b8', async ({ page }) => {
    const spec = 'w:Bc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    for (const sq of ['a7', 'b8']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // a6 was the old rank-preserving answer, and it is the wrong square colour.
    await expect(page.getByTestId(hintTestId('a6'))).toHaveCount(0)
  })

  test('Mirror attack: Bc1 captures an enemy past the seam and stops there', async ({ page }) => {
    const spec = 'w:Bc1; b:Na7'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    await expect(page.getByTestId(hintTestId('a7'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('b8'))).toHaveCount(0)
  })
})
