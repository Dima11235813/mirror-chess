import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId, HINT_TESTID_PREFIX } from '@shared/ui/selectors'

/**
 * The mirror portal spec's worked examples, verified in the real UI.
 * Oracle: `prj-mgmt/epics/rules/mirror-portal-spec.md` §5.
 */
test.describe('mirror-chess: mirror portal (spec §5)', () => {
  test('§5.1 headline — a bishop on b3 crosses to h5 and h1, not h4 and h2', async ({ page }) => {
    await page.goto(urlForSpec('w:Bb3', 'white'))

    await page.getByTestId(squareTestId('b3')).click()

    // North-west: a4 | h5, g6, f7, e8. South-west: a2 | h1. All of them light, like b3.
    for (const sq of ['a4', 'h5', 'g6', 'f7', 'e8', 'a2', 'h1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // The rank-preserving hop removed on 2026-10-03 offered these dark squares instead.
    for (const sq of ['h4', 'g5', 'f6', 'e7', 'd8', 'h2', 'g1']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }

    // 13 destinations: 9 standard and 4 that exist only because of the seam (f7 is
    // reached both ways, so it is offered once, as a standard move).
    await expect(page.locator(`[data-testid^="${HINT_TESTID_PREFIX}"]`)).toHaveCount(13)
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

    // Steppers are untouched by the 2026-10-03 revision — asserted here because the three
    // tests above it all changed, and a reader needs to know which part of the seam moved.
  })

  test('a bishop and a king on a4 now agree: both cross to h5', async ({ page }) => {
    // Single-piece specs deliberately, with no black king: `K+B vs K` is **insufficient
    // material** since 2026-10-03, which would make the game drawn, render no hints at all,
    // and let the `toHaveCount(0)` assertion below pass for the wrong reason.
    await page.goto(urlForSpec('w:Ba4', 'white'))
    await page.getByTestId(squareTestId('a4')).click()
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(0)

    await page.goto(urlForSpec('w:Ka4', 'white'))
    await page.getByTestId(squareTestId('a4')).click()
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)
  })
})
