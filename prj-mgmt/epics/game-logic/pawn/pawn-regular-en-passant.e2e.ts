import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

// Skipped until en-passant state (lastMove) is available in the URL/query loader and engine
test.describe.skip('mirror-chess: pawn regular en passant', () => {
  test('White a5 after last move b7->b5: red hint on b6, overlay on b5', async ({ page }) => {
    // Start with black pawn on b7, white pawn on a5
    const spec = 'w:Pa5; b:Pb7'
    await page.goto(urlForSpec(spec, 'black'))

    // Black moves b7->b5 (two squares) to create en passant opportunity
    await page.getByTestId(squareTestId('b7')).click()
    await page.getByTestId(squareTestId('b5')).click()

    // Now white should see en passant capture from a5 to b6
    await page.getByTestId(squareTestId('a5')).click()

    // Expect en passant destination hint on b6
    await expect(page.getByTestId(hintTestId('b6'))).toHaveCount(1)
    // TODO: also expect overlay on b5 (captured pawn square) once EP highlighting is implemented
  })

  test('Black h4 after last move g2->g4: red hint on g3, overlay on g4', async ({ page }) => {
    // Start with white pawn on g2, black pawn on h4
    const spec = 'w:Pg2; b:Ph4'
    await page.goto(urlForSpec(spec, 'white'))

    // White moves g2->g4 (two squares) to create en passant opportunity
    await page.getByTestId(squareTestId('g2')).click()
    await page.getByTestId(squareTestId('g4')).click()

    // Now black should see en passant capture from h4 to g3
    await page.getByTestId(squareTestId('h4')).click()

    // Expect en passant destination hint on g3
    await expect(page.getByTestId(hintTestId('g3'))).toHaveCount(1)
    // TODO: also expect overlay on g4 (captured pawn square) once EP highlighting is implemented
  })
})


