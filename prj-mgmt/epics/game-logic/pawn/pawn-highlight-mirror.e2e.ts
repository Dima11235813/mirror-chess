import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

test.describe('mirror-chess: pawn mirror highlights', () => {
  test('White A4: green A5, red H5 (enemy), no H8', async ({ page }) => {
    const spec = 'w:Pa4; b:Rh5'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('a4')).click()

    await expect(page.getByTestId(hintTestId('a5'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('h8'))).toHaveCount(0)
  })
})


