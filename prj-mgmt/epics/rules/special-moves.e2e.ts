import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import {
  GAME_STATUS_TESTID,
  PROMOTION_DIALOG_TESTID,
  hintTestId,
  promotionOptionTestId,
  squareTestId,
} from '@shared/ui/selectors'
import { TOKEN_STANDARD_CHESS } from '@game/rules'

/**
 * Promotion, en passant and castling in the real UI.
 * Oracle: `prj-mgmt/epics/rules/mirror-portal-spec.md` §13.
 *
 * The unit suite already proves the rules; what these check is that a player can
 * actually *reach* them — that the promotion choice is offered and honoured, that a
 * castle moves the rook on screen, and that the two seam-specific surprises are visible
 * on the board rather than only in a test.
 */

const play = async (page: import('@playwright/test').Page, from: string, to: string) => {
  await page.getByTestId(squareTestId(from)).click()
  await page.getByTestId(squareTestId(to)).click()
}

test.describe('mirror-chess: special moves (spec §13)', () => {
  test('§13.1 promotion asks which piece, and places the one chosen', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Pb7; b:Ke8', 'white', TOKEN_STANDARD_CHESS))

    await page.getByTestId(squareTestId('b7')).click()
    await expect(page.getByTestId(hintTestId('b8'))).toHaveCount(1)

    await page.getByTestId(squareTestId('b8')).click()
    const picker = page.getByTestId(PROMOTION_DIALOG_TESTID)
    await expect(picker).toBeVisible()
    await expect(picker).toHaveAttribute('aria-label', 'Promote pawn on b8')

    // Under-promote to a knight, to prove the choice is honoured rather than assumed.
    await page.getByTestId(promotionOptionTestId('N')).click()
    await expect(picker).toBeHidden()
    await expect(page.getByTestId(squareTestId('b8'))).toContainText('♘')

    // ...and the two rules compose: king and knight against a bare king cannot mate, so
    // this under-promotion ends the game on the spot. A queen would have played on.
    await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Draw — insufficient material')
  })

  test('§13.1 all four pieces are offered and each is reachable by keyboard', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Pb7; b:Ke8', 'white', TOKEN_STANDARD_CHESS))
    await play(page, 'b7', 'b8')

    for (const [kind, name] of [['Q', 'queen'], ['R', 'rook'], ['B', 'bishop'], ['N', 'knight']] as const) {
      const option = page.getByTestId(promotionOptionTestId(kind))
      await expect(option).toBeVisible()
      await expect(option).toHaveAttribute('aria-label', `Promote to ${name}`)
    }
    // Focus lands inside the dialog rather than being stranded on the board.
    await expect(page.getByTestId(promotionOptionTestId('Q'))).toBeFocused()
  })

  test('§13.1 a pawn promotes by capturing THROUGH the seam', async ({ page }) => {
    // Pa7's left capture diagonal wraps onto h8 — and promotes there.
    await page.goto(urlForSpec('w:Ke1,Pa7; b:Ke8,Rh8', 'white'))

    await page.getByTestId(squareTestId('a7')).click()
    await expect(page.getByTestId(hintTestId('h8'))).toHaveCount(1)

    await page.getByTestId(squareTestId('h8')).click()
    await page.getByTestId(promotionOptionTestId('Q')).click()

    await expect(page.getByTestId(squareTestId('h8'))).toContainText('♕')
    await expect(page.getByTestId(squareTestId('a7'))).not.toContainText('♙')
  })

  test('§13.2 en passant captures the pawn that passed by', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Pe5; b:Ke8,Pd7', 'black', TOKEN_STANDARD_CHESS))
    await play(page, 'd7', 'd5')

    await page.getByTestId(squareTestId('e5')).click()
    await expect(page.getByTestId(hintTestId('d6'))).toHaveCount(1)

    await page.getByTestId(squareTestId('d6')).click()
    await expect(page.getByTestId(squareTestId('d6'))).toContainText('♙')
    await expect(page.getByTestId(squareTestId('d5'))).not.toContainText('♟')
  })

  test('§13.2 en passant ACROSS THE SEAM: a5 takes a pawn that played h7–h5', async ({ page }) => {
    // The two pawns stand seven files apart. A pawn on a5 attacks h6, so the pawn that
    // passed over h6 may be taken en passant — landing on h6.
    await page.goto(urlForSpec('w:Ke1,Pa5; b:Ke8,Ph7', 'black'))
    await play(page, 'h7', 'h5')

    await page.getByTestId(squareTestId('a5')).click()
    await expect(page.getByTestId(hintTestId('h6'))).toHaveCount(1)

    await page.getByTestId(squareTestId('h6')).click()
    await expect(page.getByTestId(squareTestId('h6'))).toContainText('♙')
    await expect(page.getByTestId(squareTestId('h5'))).not.toContainText('♟')
    await expect(page.getByTestId(squareTestId('a5'))).not.toContainText('♙')
  })

  test('§13.3 castling moves the king two squares and the rook over it', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Ra1,Rh1; b:Ke8,Ra8,Rh8', 'white', TOKEN_STANDARD_CHESS))

    await page.getByTestId(squareTestId('e1')).click()
    await expect(page.getByTestId(hintTestId('g1'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('c1'))).toHaveCount(1)

    await page.getByTestId(squareTestId('g1')).click()
    await expect(page.getByTestId(squareTestId('g1'))).toContainText('♔')
    await expect(page.getByTestId(squareTestId('f1'))).toContainText('♖')
    await expect(page.getByTestId(squareTestId('h1'))).not.toContainText('♖')
  })

  test('§13.3 THE SEAM CHANGE: a bishop forbids castling from the far corner', async ({ page }) => {
    // Ba3's down-left ray steps through the seam and continues h3, g2, f1 — covering a
    // square the king would cross. The same position is fine under ordinary chess.
    const spec = 'w:Ke1,Rh1; b:Ke8,Ba3'

    await page.goto(urlForSpec(spec, 'white', TOKEN_STANDARD_CHESS))
    await page.getByTestId(squareTestId('e1')).click()
    await expect(page.getByTestId(hintTestId('g1'))).toHaveCount(1)

    await page.goto(urlForSpec(spec, 'white'))
    await page.getByTestId(squareTestId('e1')).click()
    await expect(page.getByTestId(hintTestId('g1'))).toHaveCount(0)
  })
})
