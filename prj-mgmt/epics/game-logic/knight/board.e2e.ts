import { test, expect } from '@playwright/test'
import { urlForScenario } from '@shared/boards'
import { KNIGHT_A3_SCENARIO } from '@mocks/mock-knight-moves'
import { squareTestId, hintTestId, HINT_TESTID_PREFIX } from '@shared/ui/selectors'

test.describe('mirror-chess: knight moves from a3', () => {
  test(KNIGHT_A3_SCENARIO.name, async ({ page }) => {
    await page.goto(urlForScenario(KNIGHT_A3_SCENARIO))

    await page.getByTestId(squareTestId(KNIGHT_A3_SCENARIO.select)).click()

    for (const sq of KNIGHT_A3_SCENARIO.mustHints) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }

    for (const sq of KNIGHT_A3_SCENARIO.mustNotHints ?? []) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }

    // Four L-moves on this side (one blocked by an own pawn) plus four across the seam.
    const allHints = page.locator(`[data-testid^="${HINT_TESTID_PREFIX}"]`)
    await expect(allHints).toHaveCount(KNIGHT_A3_SCENARIO.mustHints.length)
  })
})
