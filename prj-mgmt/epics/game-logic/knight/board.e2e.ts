import { test, expect } from '@playwright/test'
import { urlForScenario } from '@shared/boards'
import { KNIGHT_MIRROR_A3_SCENARIO } from '@mocks/mock-knight-mirror-move'

test.describe('mirror-chess: knight mirror moves', () => {
  test(KNIGHT_MIRROR_A3_SCENARIO.name, async ({ page }) => {
    await page.goto(urlForScenario(KNIGHT_MIRROR_A3_SCENARIO))

    await page.getByTestId(`square-${KNIGHT_MIRROR_A3_SCENARIO.select}`).click()

    for (const sq of KNIGHT_MIRROR_A3_SCENARIO.mustHints) {
      await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1)
    }
    for (const sq of KNIGHT_MIRROR_A3_SCENARIO.mustNotHints ?? []) {
      await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(0)
    }
  })
})


