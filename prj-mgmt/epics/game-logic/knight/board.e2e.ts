import { test, expect } from '@playwright/test'
import { urlForScenario } from '@shared/boards'
import { KNIGHT_MIRROR_A3_SCENARIO } from '@mocks/mock-knight-mirror-move'

test.describe('mirror-chess: knight moves from a3', () => {
  test(KNIGHT_MIRROR_A3_SCENARIO.name, async ({ page }) => {
    await page.goto(urlForScenario(KNIGHT_MIRROR_A3_SCENARIO))

    // Click on the knight at a3
    await page.getByTestId(`square-${KNIGHT_MIRROR_A3_SCENARIO.select}`).click()

    // Validate that required move hints are displayed
    for (const sq of KNIGHT_MIRROR_A3_SCENARIO.mustHints) {
      await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1)
    }

    // Validate that invalid move hints are NOT displayed
    for (const sq of KNIGHT_MIRROR_A3_SCENARIO.mustNotHints ?? []) {
      await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(0)
    }

    // Additional validation: ensure we have exactly the expected number of hints
    // Knight on a3 should have: b1, b5, c1, c3 (regular L-moves) + h3 (mirror move) = 5 total
    const allHints = page.locator('[data-testid^="hint-"]')
    await expect(allHints).toHaveCount(5)
  })
})


