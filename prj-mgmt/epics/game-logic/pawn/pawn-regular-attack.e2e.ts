import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

test.describe('mirror-chess: pawn regular attacks', () => {
  test('White pawn e4: can capture d5 and f5 (enemy), not diagonals if empty', async ({ page }) => {
    const spec = 'w:Pe4; b:Pd5,Pf5'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId(squareTestId('e4')).click()

    await expect(page.getByTestId(hintTestId('d5'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('f5'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('d3'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('f3'))).toHaveCount(0)
  })
})


