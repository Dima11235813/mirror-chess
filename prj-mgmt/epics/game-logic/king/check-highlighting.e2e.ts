import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import {
  MOVE_MESSAGE_TESTID,
  SquareHintClass,
  SquareStateClass,
  hintTestId,
  squareTestId,
} from '@shared/ui/selectors'

/**
 * Check feedback and hint semantics in the real UI.
 * Story: `prj-mgmt/epics/game-logic/king/check-highlighting.md`.
 */
test.describe('mirror-chess: check highlighting and hint semantics', () => {
  test('portal destinations are marked differently from ordinary ones', async ({ page }) => {
    await page.goto(urlForSpec('w:Bc1', 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    // h3 is reached through the seam; d2 is an ordinary diagonal step.
    await expect(page.getByTestId(hintTestId('h3'))).toHaveClass(new RegExp(SquareHintClass.Mirror))
    await expect(page.getByTestId(hintTestId('d2'))).not.toHaveClass(new RegExp(SquareHintClass.Mirror))
  })

  test('a portal destination says so in its accessible name', async ({ page }) => {
    await page.goto(urlForSpec('w:Bc1', 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    await expect(page.getByTestId(squareTestId('h3')))
      .toHaveAttribute('aria-label', 'h3, empty, legal mirror move through the seam')
    await expect(page.getByTestId(squareTestId('d2')))
      .toHaveAttribute('aria-label', 'd2, empty, legal move')
  })

  test('a capture is announced as a capture, not just a move', async ({ page }) => {
    await page.goto(urlForSpec('w:Bc1; b:Pe3', 'white'))

    await page.getByTestId(squareTestId('c1')).click()

    await expect(page.getByTestId(squareTestId('e3')))
      .toHaveAttribute('aria-label', 'e3, black pawn, legal capture')
  })

  test('the checked king and the piece giving check are both marked', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1; b:Re8', 'white'))

    await expect(page.getByTestId(squareTestId('e1'))).toHaveClass(new RegExp(SquareStateClass.Check))
    await expect(page.getByTestId(squareTestId('e1')))
      .toHaveAttribute('aria-label', 'e1, white king, in check')

    await expect(page.getByTestId(squareTestId('e8'))).toHaveClass(new RegExp(SquareStateClass.Checker))
    await expect(page.getByTestId(squareTestId('e8')))
      .toHaveAttribute('aria-label', 'e8, black rook, giving check')
  })

  test('the checking line is marked, and for a portal check shows the whole journey', async ({ page }) => {
    // Bb3 leaves via a2, re-enters on h2 and hits the king on g1.
    await page.goto(urlForSpec('w:Bb3; b:Kg1', 'black'))

    for (const sq of ['a2', 'h2']) {
      await expect(page.getByTestId(squareTestId(sq))).toHaveClass(new RegExp(SquareStateClass.CheckPath))
      await expect(page.getByTestId(squareTestId(sq)))
        .toHaveAttribute('aria-label', `${sq}, empty, on the checking line`)
    }
    await expect(page.getByTestId(squareTestId('g1'))).toHaveClass(new RegExp(SquareStateClass.Check))
    await expect(page.getByTestId(squareTestId('b3'))).toHaveClass(new RegExp(SquareStateClass.Checker))
  })

  test('checkmate and stalemate are marked distinctly from an ordinary check', async ({ page }) => {
    await page.goto(urlForSpec('w:Ka1,Re8; b:Kg8,Pf7,Pg7,Ph7', 'black'))
    await expect(page.getByTestId(squareTestId('g8'))).toHaveClass(new RegExp(SquareStateClass.Mate))
    await expect(page.getByTestId(squareTestId('g8')))
      .toHaveAttribute('aria-label', 'g8, black king, checkmated')

    await page.goto(urlForSpec('w:Ka1,Qf6,Rh1; b:Kg8', 'black'))
    await expect(page.getByTestId(squareTestId('g8'))).toHaveClass(new RegExp(SquareStateClass.Stalemate))
    await expect(page.getByTestId(squareTestId('g8')))
      .toHaveAttribute('aria-label', 'g8, black king, stalemated')
  })

  test('picking a square king safety forbids explains why', async ({ page }) => {
    // The rook on e2 is pinned by the rook on e8; d2 is a rook move but illegal.
    await page.goto(urlForSpec('w:Ke1,Re2; b:Re8', 'white'))

    await expect(page.getByTestId(MOVE_MESSAGE_TESTID)).toHaveText('')

    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(squareTestId('d2')).click()

    await expect(page.getByTestId(MOVE_MESSAGE_TESTID))
      .toHaveText('Not allowed: that move would leave your king in check.')
    // The piece stays selected so the player can choose again.
    await expect(page.getByTestId(hintTestId('e3'))).toHaveCount(1)
  })

  test('the message clears once a legal move is played', async ({ page }) => {
    await page.goto(urlForSpec('w:Ke1,Re2; b:Re8', 'white'))

    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(squareTestId('d2')).click()
    await expect(page.getByTestId(MOVE_MESSAGE_TESTID)).not.toHaveText('')

    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(squareTestId('e4')).click()

    await expect(page.getByTestId(MOVE_MESSAGE_TESTID)).toHaveText('')
  })
})
