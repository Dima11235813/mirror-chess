import { test, expect } from '@playwright/test'
import { SPEC_C6_Q_WRAP, urlForSpec } from '@shared/boards'

test('mirror-chess: c6 queen can wrap-left to h6; cannot move to d6 (own pawn)', async ({ page }) => {
  await page.goto(urlForSpec(SPEC_C6_Q_WRAP, 'black'))

  await page.getByTestId('square-c6').click()

  await expect(page.getByTestId('hint-h6')).toHaveCount(1)
  await expect(page.getByTestId('hint-d6')).toHaveCount(0)

  for (const sq of ['b7', 'a8', 'b6', 'c7']) {
    await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1)
  }
})