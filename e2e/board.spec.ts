import { test, expect } from '@playwright/test'

test('mirror-chess: c6 queen hints obey blocking', async ({ page }) => {
  await page.goto('/?board=b:Qc6,Pd6,Pg6&turn=black')

  await page.getByTestId('square-c6').click()

  await expect(page.getByTestId('hint-h6')).toHaveCount(0)
  await expect(page.getByTestId('hint-d6')).toHaveCount(0)

  for (const sq of ['b7', 'a8', 'b6', 'c7']) {
    await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1)
  }
})