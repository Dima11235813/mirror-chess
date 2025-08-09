import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'

test.describe('mirror-chess: bishop moves', () => {
  test('Bc1: slides on diagonals; stops at first capture (e3)', async ({ page }) => {
    // White bishop at c1; black pawn at e3 blocks further NE squares
    const spec = 'w:Bc1; b:Pe3'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId('square-c1').click()

    // Reachable: d2 (empty), e3 (capture), b2, a3
    for (const sq of ['d2', 'e3', 'b2', 'a3']) {
      await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1)
    }
    // Not reachable beyond the capture along the same ray
    for (const sq of ['f4', 'g5', 'h6']) {
      await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(0)
    }
  })

  test('Bf1: can mirror to c1 when rank path is clear (capture allowed)', async ({ page }) => {
    // White bishop at f1 with a black rook at c1; e1 and d1 are empty so mirror is legal
    const spec = 'w:Bf1; b:Rc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId('square-f1').click()

    await expect(page.getByTestId('hint-c1')).toHaveCount(1)
  })

  test('Bf1: cannot mirror to c1 if own piece blocks rank path', async ({ page }) => {
    // White king on e1 blocks the f1↔c1 rank path; mirror should be disallowed
    const spec = 'w:Bf1,Ke1; b:Rc1'
    await page.goto(urlForSpec(spec, 'white'))

    await page.getByTestId('square-f1').click()

    await expect(page.getByTestId('hint-c1')).toHaveCount(0)
  })
})


