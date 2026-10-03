import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId, GAME_STATUS_TESTID } from '@shared/ui/selectors'

/**
 * The legality layer in the real UI.
 * Oracle: `prj-mgmt/epics/rules/mirror-portal-spec.md` §10.
 */
test.describe('mirror-chess: legality (spec §10)', () => {
  test('§10.3 a pinned rook is offered only moves along the pin', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Re2; b:Re8', 'white'))

    await page.getByTestId(squareTestId('e2')).click()

    for (const sq of ['e3', 'e4', 'e5', 'e6', 'e7', 'e8']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // Stepping off the e-file would expose the king to the rook on e8.
    for (const sq of ['d2', 'f2', 'a2', 'h2']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
    }
  })

  test('§10.3 a king may not step along the checking ray, and check is announced', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1; b:Re8', 'white'))

    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white — check')

    await page.getByTestId(squareTestId('e1')).click()

    for (const sq of ['d1', 'f1', 'd2', 'f2']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    await expect(page.getByTestId(hintTestId('e2'))).toHaveCount(0)
  })

  test('§10.1 check through the seam restricts the king and is announced', async ({ page }) => {
    // The bishop on b3 runs a4 | h5, g6, f7, e8 (spec §5.1 as revised), so it checks a
    // king on g6 with no standard diagonal reaching it.
    await page.goto(urlForSpec('w:Bb3; b:Kg6', 'black'))

    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: black — check')

    await page.getByTestId(squareTestId('g6')).click()

    for (const sq of ['f5', 'f6', 'g5', 'g7', 'h6', 'h7']) {
      await expect(page.getByTestId(hintTestId(sq))).toHaveCount(1)
    }
    // h5 and f7 are the ray's own squares either side of the king.
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('f7'))).toHaveCount(0)
  })

  test('§10.4 checkmate is announced and no move can be made', async ({ page }) => {
    await page.goto(urlForSpec('w:Ka1,Re8; b:Kg8,Pf7,Pg7,Ph7', 'black'))

    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Checkmate — white wins')

    await page.getByTestId(squareTestId('g8')).click()
    await expect(page.locator('[data-testid^="hint-"]')).toHaveCount(0)
  })

  test('§11.2 a king on the h-file escapes the same position through the seam', async ({ page }) => {
    // Identical to the mate above but with the king on h8, which can wrap onto a8
    // and take the rook. Cornering a king against the edge no longer works.
    await page.goto(urlForSpec('w:Ka1,Ra8; b:Kh8,Pg7,Ph7', 'black'))

    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: black — check')

    await page.getByTestId(squareTestId('h8')).click()
    await expect(page.getByTestId(hintTestId('a8'))).toHaveCount(1)
  })

  test('§10.4 stalemate is announced as a draw', async ({ page }) => {
    await page.goto(urlForSpec('w:Ka1,Qf6,Rh1; b:Kg8', 'black'))

    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Stalemate — draw')
  })
})
