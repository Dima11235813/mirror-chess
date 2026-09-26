import { test, expect } from '@playwright/test'
import {
  PUZZLE_MODE_TESTID,
  PUZZLE_NEXT_TESTID,
  PUZZLE_PROMPT_TESTID,
  PUZZLE_REVEAL_TESTID,
  PUZZLE_SCREEN_TESTID,
  PUZZLE_VERDICT_TESTID,
  GAME_STATUS_TESTID,
  squareTestId,
} from '@shared/ui/selectors'

/**
 * Solving a puzzle, against the **real committed set**.
 * Story: [`puzzle-screen.md`](./puzzle-screen.md).
 *
 * The integration tests drive the component with two pinned puzzles; these drive the
 * shipped app with `puzzles/mate-in-2.v1.json`, so a set regenerated with different
 * criteria — or a screen that loads the wrong file — fails here.
 *
 * **Puzzle 2** of the committed set is `5Bk1/8/8/6K1/2n5/2B5/8/8 w`, solved by `f8-c4*`: the
 * bishop slides right through `h6`, wraps to `a6` and returns along `b5` to take the
 * knight. It is pinned in `src/puzzles/mate.test.ts` too, so if the set changes, the
 * failure names the reason rather than just breaking this test. Tests that depend on that
 * position open it by index rather than assuming it comes first — it does not, and
 * assuming it did cost three red tests.
 */

/** The seam puzzle, opened by index. `?puzzle=` is 1-based, as the screen numbers them. */
const SEAM_PUZZLE_URL = '/?mode=puzzles&puzzle=2'

const play = async (page: import('@playwright/test').Page, from: string, to: string) => {
  await page.getByTestId(squareTestId(from)).click()
  await page.getByTestId(squareTestId(to)).click()
}

test.describe('mirror-chess: solving a puzzle', () => {
  test('the header opens puzzles and goes back to the game', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId(PUZZLE_SCREEN_TESTID)).toHaveCount(0)

    await page.getByTestId(PUZZLE_MODE_TESTID).click()
    await expect(page.getByTestId(PUZZLE_SCREEN_TESTID)).toBeVisible()
    // The game's own status line is gone: puzzles replace the board, they do not sit beside it.
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveCount(0)

    await page.getByTestId(PUZZLE_MODE_TESTID).click()
    await expect(page.getByTestId(PUZZLE_SCREEN_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toBeVisible()
  })

  test('a link opens the puzzle screen directly', async ({ page }) => {
    await page.goto('/?mode=puzzles')

    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('White to play. Mate in 2.')
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('Puzzle 1 of')
  })

  test('the answer is hidden until the puzzle is solved', async ({ page }) => {
    await page.goto('/?mode=puzzles')

    await expect(page.getByTestId(PUZZLE_REVEAL_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(PUZZLE_VERDICT_TESTID)).toContainText('Find the move')
  })

  test('the seam solution is accepted, and the route is revealed after', async ({ page }) => {
    await page.goto(SEAM_PUZZLE_URL)
    await play(page, 'f8', 'c4')

    await expect(page.getByTestId(PUZZLE_VERDICT_TESTID)).toContainText('Solved')
    const reveal = page.getByTestId(PUZZLE_REVEAL_TESTID)
    await expect(reveal).toContainText('f8-c4*')
    await expect(reveal).toContainText('crosses the seam')
    await expect(reveal).toContainText('Impossible in chess')
    // The journey through the seam, which is the part a player cannot reconstruct.
    await expect(reveal).toContainText('h6')
  })

  test('a wrong move is refused and the position is kept', async ({ page }) => {
    await page.goto(SEAM_PUZZLE_URL)
    await play(page, 'c3', 'd4')

    await expect(page.getByTestId(PUZZLE_VERDICT_TESTID)).toContainText('Not the move')
    await expect(page.getByTestId(PUZZLE_REVEAL_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(squareTestId('c3'))).toContainText('♗')
  })

  test('next moves on, and the new puzzle hides its own answer', async ({ page }) => {
    await page.goto(SEAM_PUZZLE_URL)
    await play(page, 'f8', 'c4')
    await page.getByTestId(PUZZLE_NEXT_TESTID).click()

    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('Puzzle 3 of')
    await expect(page.getByTestId(PUZZLE_REVEAL_TESTID)).toHaveCount(0)
  })

  test('a link can open one specific puzzle', async ({ page }) => {
    await page.goto('/?mode=puzzles&puzzle=2')

    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('Puzzle 2 of')
  })

  test('the board still shows portal destinations while solving', async ({ page }) => {
    // The puzzle screen reuses BoardView unchanged, so the cues a player relies on in a
    // game are the same ones here — including the hollow ring for a seam destination.
    await page.goto(SEAM_PUZZLE_URL)
    await page.getByTestId(squareTestId('f8')).click()

    await expect(page.getByTestId(squareTestId('c4'))).toHaveAttribute(
      'aria-label',
      /legal mirror capture through the seam$/,
    )
  })
})
