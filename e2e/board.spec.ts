import { test, expect } from '@playwright/test';

// Tip: add data-testid on squares and hint-circles in your app.
// e.g., <div data-testid="square-c6" ...>  and  <div data-testid="hint-h6" ...>
test('mirror-chess: c6 queen hints obey blocking', async ({ page }) => {
  await page.goto('/?board=b:Qc6,Pd6,Pg6&turn=black');

  // Click c6 (black queen)
  await page.getByTestId('square-c6').click();

  // No hint circle on h6 (shouldn’t be a mirror/leap there)
  await expect(page.getByTestId('hint-h6')).toHaveCount(0);

  // No move possible to d6 (blocked by own pawn)
  await expect(page.getByTestId('hint-d6')).toHaveCount(0);

  // Normal queen moves that aren’t blocked ARE hinted (examples — adjust to your rules)
  // diagonal up-left to b7, a8; horizontal left to b6; vertical up to c7, c8 (etc.)
  for (const sq of ['b7', 'a8', 'b6', 'c7']) {
    await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1);
  }
});
