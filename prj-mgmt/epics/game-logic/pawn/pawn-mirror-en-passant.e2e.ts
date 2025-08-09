import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId } from '@shared/ui/selectors'

// Skipped until en-passant state is introduced into the URL/query loader and engine
test.describe.skip('mirror-chess: pawn mirror en passant', () => {
  test('White a5 after last move h7->h5: red hint on h6, capture removes h5 pawn', async ({ page }) => {
    // Start with black pawn on h7, white pawn on a5
    const spec = 'w:Pa5; b:Ph7'
    await page.goto(urlForSpec(spec, 'black'))

    // Black moves h7->h5 (two squares) to create en passant opportunity
    await page.getByTestId(squareTestId('h7')).click()
    await page.getByTestId(squareTestId('h5')).click()

    // Now white should see mirror en passant capture from a5 to h6
    await page.getByTestId(squareTestId('a5')).click()

    // Expect mirror en passant destination hint on h6
    await expect(page.getByTestId(hintTestId('h6'))).toHaveCount(1)
    // TODO: also expect overlay on h5 (captured pawn square) once EP highlighting is implemented
  })

  test('Black h4 after last move a2->a4: red hint on a2, capture removes a4 pawn', async ({ page }) => {
    // Start with white pawn on a2, black pawn on h4
    const spec = 'w:Pa2; b:Ph4'
    await page.goto(urlForSpec(spec, 'white'))

    // White moves a2->a4 (two squares) to create en passant opportunity
    await page.getByTestId(squareTestId('a2')).click()
    await page.getByTestId(squareTestId('a4')).click()

    // Now black should see mirror en passant capture from h4 to a2
    await page.getByTestId(squareTestId('h4')).click()

    // Expect mirror en passant destination hint on a2
    await expect(page.getByTestId(hintTestId('a2'))).toHaveCount(1)
    // TODO: also expect overlay on a4 (captured pawn square) once EP highlighting is implemented
  })
})


