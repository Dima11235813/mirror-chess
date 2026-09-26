import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId, HINT_TESTID_PREFIX } from '@shared/ui/selectors'

/**
 * The mirror portal spec's worked examples, verified in the real UI.
 * Oracle: `prj-mgmt/epics/rules/mirror-portal-spec.md` §5.
 */
test.describe('mirror-chess: mirror portal (spec §5)', () => {
  test('§5.1 headline — a bishop on b3 shows portal mouths on h4 and h2, not h5', async ({ page }) => {
    await page.goto(urlForSpec('w:Bb3', 'white'))

    await page.getByTestId(squareTestId('b3')).click()

    // Left seam via a4 → h4,g5,f6,e7,d8; via a2 → h2,g1.
    for (const sq of ['h4', 'g5', 'f6', 'e7', 'd8', 'h2', 'g1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // The cylinder-wrap bug advanced the rank on the hop and produced these instead.
    for (const sq of ['h5', 'h1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }

    // 9 standard destinations + 7 portal destinations.
    await expect(page.locator(`[data-testid^="${HINT_TESTID_PREFIX}"]`)).toHaveCount(16)
  })

  test('§5.3 — a rook on a4 reaches behind an enemy on c4 through the seam', async ({ page }) => {
    await page.goto(urlForSpec('w:Ra4; b:Pc4', 'white'))

    await page.getByTestId(squareTestId('a4')).click()

    for (const sq of ['h4', 'g4', 'f4', 'e4', 'd4']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // c4 stays an ordinary capture, and the ray stops there rather than wrapping again.
    await expect(page.getByTestId(hintTestId('c4'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('b4'))).toHaveCount(1)
  })

  test('§11.4 a knight on a3 keeps all eight moves, four across the seam', async ({ page }) => {
    await page.goto(urlForSpec('w:Na3', 'white'))

    await page.getByTestId(squareTestId('a3')).click()

    for (const sq of ['b5', 'c4', 'c2', 'b1', 'h5', 'g4', 'g2', 'h1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // The rejected "file mirror on the same rank" idea would have put a hint here.
    await expect(page.getByTestId(hintTestId('h3'))).toHaveCount(0)
    await expect(page.locator(`[data-testid^="${HINT_TESTID_PREFIX}"]`)).toHaveCount(8)
  })

  test('§11.4 a king on a3 steps across the seam to h2, h3 and h4', async ({ page }) => {
    await page.goto(urlForSpec('w:Ka3', 'white'))

    await page.getByTestId(squareTestId('a3')).click()

    for (const sq of ['a4', 'a2', 'b4', 'b3', 'b2', 'h4', 'h3', 'h2']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
  })

  test('§11.2 a pawn pushes without wrapping but captures across the seam', async ({ page }) => {
    await page.goto(urlForSpec('w:Pa4; b:Rh5', 'white'))

    await page.getByTestId(squareTestId('a4')).click()

    await expect(page.getByTestId(hintTestId('a5'))).toHaveCount(1) // push
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1) // capture across the seam
    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(0) // never sideways
  })
})
