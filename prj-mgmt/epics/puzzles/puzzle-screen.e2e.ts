import { test, expect } from '@playwright/test'
import {
  PUZZLE_MODE_TESTID,
  PUZZLE_NEXT_TESTID,
  PUZZLE_PROMPT_TESTID,
  PUZZLE_REVEAL_TESTID,
  PUZZLE_SCREEN_TESTID,
  PUZZLE_VERDICT_TESTID,
  PUZZLE_BAND_TESTID,
  GAME_STATUS_TESTID,
  squareTestId,
} from '@shared/ui/selectors'

/**
 * Solving a puzzle, against the **real committed set**.
 * Story: [`puzzle-screen.md`](./puzzle-screen.md).
 *
 * The integration tests drive the component with pinned puzzles; these drive the shipped
 * app with `puzzles/puzzles.v3.json`, so a set regenerated with different criteria — or a
 * screen that loads the wrong file — fails here.
 */

/**
 * The seam puzzle, opened by **id**.
 *
 * Indexes were the first attempt and cost three red runs: the library is re-mined whenever
 * a criterion changes, and every index shifts. An id is derived from the position and the
 * ruleset, so it survives a re-mine — which is also why a bug report should carry one.
 *
 * `0lehvlg` is `8/6Rp/8/8/8/1K6/8/B6k w`, solved by `a1-d6*`: the bishop's north-west ray
 * leaves the board at `a1`, re-enters on `h2`, and runs up `g3, f4, e5` to `d6`. It is also
 * the `SEAM_PUZZLE` of `PuzzleScreen.mocks.ts`, so a set change breaks the component tests
 * next to this one and the failure names the reason.
 *
 * Re-pinned 2026-10-03: the previous id `1b53rpm` was a bishop *capture* across the seam,
 * and no such puzzle exists any more — there are **no seam captures at all** in the 248
 * puzzles mined under the revised crossing, because a colour-preserving ray through sparse
 * material rarely meets anything. The "mirror capture" cue is covered instead by the
 * hand-built fixtures in `../rules/piece-capabilities.e2e.ts`.
 */
const SEAM_PUZZLE_URL = '/?mode=puzzles&puzzle=0lehvlg'

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

    // Not "Mate in 2": the library is mixed, and the first puzzle in play order is
    // whichever the diversity ordering put there. Asserting the goal of puzzle 1 would
    // pin an ordering that is meant to change whenever the set is re-mined.
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText(/White to play\. Mate in [23]\./)
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('Puzzle 1 of')
  })

  test('the answer is hidden until the puzzle is solved', async ({ page }) => {
    await page.goto('/?mode=puzzles')

    await expect(page.getByTestId(PUZZLE_REVEAL_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(PUZZLE_VERDICT_TESTID)).toContainText('Find the move')
  })

  test('the seam solution is accepted, and the route is revealed after', async ({ page }) => {
    await page.goto(SEAM_PUZZLE_URL)
    await play(page, 'a1', 'd6')

    await expect(page.getByTestId(PUZZLE_VERDICT_TESTID)).toContainText('Solved')
    const reveal = page.getByTestId(PUZZLE_REVEAL_TESTID)
    await expect(reveal).toContainText('a1-d6*')
    await expect(reveal).toContainText('crosses the seam')
    await expect(reveal).toContainText('Impossible in chess')
    // The journey through the seam, which is the part a player cannot reconstruct.
    await expect(reveal).toContainText('h2')
    // ...and the piece is actually on the destination, which only a screenshot caught the
    // first time this screen shipped.
    await expect(page.getByTestId(squareTestId('d6'))).toContainText('♗')
    await expect(page.getByTestId(squareTestId('a1'))).not.toContainText('♗')
  })

  test('a wrong move is refused and the position is kept', async ({ page }) => {
    await page.goto(SEAM_PUZZLE_URL)
    await play(page, 'g7', 'g8')

    await expect(page.getByTestId(PUZZLE_VERDICT_TESTID)).toContainText('Not the move')
    await expect(page.getByTestId(PUZZLE_REVEAL_TESTID)).toHaveCount(0)
    await expect(page.getByTestId(squareTestId('g7'))).toContainText('♖')
  })

  test('next moves on, and the new puzzle hides its own answer', async ({ page }) => {
    await page.goto(SEAM_PUZZLE_URL)
    const before = await page.getByTestId(PUZZLE_PROMPT_TESTID).textContent()
    await play(page, 'a1', 'd6')
    await page.getByTestId(PUZZLE_NEXT_TESTID).click()

    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).not.toHaveText(before ?? '')
    await expect(page.getByTestId(PUZZLE_REVEAL_TESTID)).toHaveCount(0)
  })

  test('a link can open one specific puzzle, by index or by id', async ({ page }) => {
    await page.goto('/?mode=puzzles&puzzle=2')
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('Puzzle 2 of')

    // The durable form: an id keeps pointing at the same puzzle across a re-mine.
    await page.goto(SEAM_PUZZLE_URL)
    await page.getByTestId(squareTestId('a1')).click()
    await expect(page.getByTestId(squareTestId('d6'))).toHaveAttribute(
      'aria-label', /legal mirror move through the seam$/,
    )
  })

  test('shows a difficulty band and the goal the puzzle actually has', async ({ page }) => {
    // Bands are a coarse label, never a rating: difficulty cannot be predicted from a
    // position, so the honest claim is only that these roughly order the library.
    await page.goto('/?mode=puzzles')

    await expect(page.getByTestId(PUZZLE_BAND_TESTID)).toHaveText(/easy|medium|hard/)
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText(/Mate in [23]/)
  })

  test('the board still shows portal destinations while solving', async ({ page }) => {
    // The puzzle screen reuses BoardView unchanged, so the cues a player relies on in a
    // game are the same ones here — including the hollow ring for a seam destination.
    await page.goto(SEAM_PUZZLE_URL)
    await page.getByTestId(squareTestId('a1')).click()

    await expect(page.getByTestId(squareTestId('d6'))).toHaveAttribute(
      'aria-label',
      /legal mirror move through the seam$/,
    )
  })
})
