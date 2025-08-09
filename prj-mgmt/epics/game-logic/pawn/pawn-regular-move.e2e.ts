import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

test.describe('mirror-chess: pawn regular moves', () => {
  test('White pawn e2: can go to e3 and e4 if path/landing empty', async ({ page }) => {
    const spec = 'w:Pe2'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('e2')).click()

    await expect(page.getByTestId(hintTestId('e3'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('e4'))).toHaveCount(1)
  })

  test('White pawn e2: blocked forward on center prevents e3/e4', async ({ page }) => {
    const spec = 'w:Pe2,Pe3'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('e2')).click()

    await expect(page.getByTestId(hintTestId('e3'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('e4'))).toHaveCount(0)
  })
})


