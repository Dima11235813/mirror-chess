import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { squareTestId, hintTestId, GAME_STATUS_TESTID } from '@shared/ui/selectors'
import { TOKEN_STANDARD_CHESS } from '@game/rules'

/**
 * The draw rules in the real UI.
 * Oracle: `prj-mgmt/epics/rules/draw-rules.md`.
 *
 * Each draw must be announced *by name* in the footer's live region, and a drawn game
 * must stop accepting moves. That second part matters more here than for checkmate: mate
 * enforces itself by leaving no legal move, whereas a game drawn by repetition, the clock
 * or material still has plenty of legal moves on the board.
 */
test.describe('mirror-chess: draw rules', () => {
  test('bare kings are announced as insufficient material', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1; b:Ke8', 'white'))

    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Draw — insufficient material')
  })

  test('a drawn game offers no moves and does not move when clicked', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1; b:Ke8', 'white'))

    await page.getByTestId(squareTestId('e1')).click()
    await expect(page.locator('[data-testid^="hint-"]')).toHaveCount(0)
    // The king is still on e1 — the reducer refused the move, and so did the board.
    await expect(page.getByTestId(squareTestId('e1'))).toContainText('♔')
  })

  test('a lone bishop draws in chess but is a live game once it crosses the seam', async ({ page }) => {
    // The same board, two answers. Under chess rules the bishop can never mate; under the
    // mirror rules it can, because its ray continues through the seam onto the squares a
    // king would flee to. See `src/game/draw-rules.ts`.
    await page.goto(urlForSpec('w:Ke1,Bc1; b:Ke8', 'white', TOKEN_STANDARD_CHESS))
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Draw — insufficient material')

    await page.goto(urlForSpec('w:Ke1,Bc1; b:Ke8', 'white'))
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white')
  })

  test('the fifty-move rule is announced when the clock runs out', async ({ page }) => {
    // `clock` presets the halfmove counter; playing a hundred halfmoves through the UI is
    // not a test anybody would run.
    await page.goto(urlForSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white', undefined, 99))
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white')

    await page.goto(urlForSpec('w:Ke1,Ra1; b:Ke8,Rh8', 'white', undefined, 100))
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Draw — fifty-move rule')
  })

  test('threefold repetition is announced after the knights shuffle back twice', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Nb1; b:Ke8,Nb8', 'white'))

    const play = async (from: string, to: string) => {
      await page.getByTestId(squareTestId(from)).click()
      await page.getByTestId(squareTestId(to)).click()
    }
    const cycle = [['b1', 'c3'], ['b8', 'c6'], ['c3', 'b1'], ['c6', 'b8']] as const

    for (const [from, to] of cycle) await play(from, to)
    // Second occurrence of the opening position: not yet a draw.
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: white')

    for (const [from, to] of cycle) await play(from, to)
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Draw — threefold repetition')
  })
})
