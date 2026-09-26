import { test, expect } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { hintTestId, squareTestId } from '@shared/ui/selectors'
import { TOKEN_ALL_ON, TOKEN_SLIDERS_ONLY, ruleSetOf, tokenOf } from '@game/rules'

/**
 * A piece attacks exactly where it can move — in the real UI.
 * Oracle: `prj-mgmt/epics/rules/mirror-portal-spec.md` §2.1, and the story
 * [`adjacent-kings.md`](./adjacent-kings.md).
 *
 * The unit suite proves the rule over generated positions. What these check is that a
 * *player* cannot do the thing the rule forbids: that the forbidden square is not offered
 * as a hint, and is not accepted when clicked anyway. A rule that holds in
 * `legalMovesFor` but leaks through the board is still a bug the player meets.
 *
 * **Every position carries a pawn each.** Two lone kings are insufficient material, so the
 * game is already drawn, no hints render at all, and a test asserting "this square is not
 * offered" passes without testing anything. That happened while writing these — the pawns
 * are what make the assertions mean something.
 */

const KING_ONLY = tokenOf(ruleSetOf(['K']))

/** Idle pawns on the d-file: material enough to keep the game alive, far from the seam. */
const KINGS_AT_THE_SEAM = 'w:Kb1,Pd2; b:Kh1,Pd7'

const select = async (page: import('@playwright/test').Page, square: string) => {
  await page.getByTestId(squareTestId(square)).click()
}

test.describe('mirror-chess: a piece attacks where it moves (spec §2.1)', () => {
  test('the king crosses the seam when the far side is empty', async ({ page }) => {
    // Baseline. A king on a4 wraps its file keeping its rank (§11), so h3, h4 and h5
    // exist only because of the seam — everything below is about when they vanish.
    await page.goto(urlForSpec('w:Ka4,Pd2; b:Kd8,Pd7', 'white', TOKEN_ALL_ON))
    await select(page, 'a4')

    await expect(page.getByTestId(hintTestId('h3'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(1)
    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(1)
  })

  test('the king may not step beside the enemy king across the seam', async ({ page }) => {
    // The case that forced the rule. a1 and a2 are adjacent to h1 only through the seam,
    // so under an all-on ruleset the enemy king guards both.
    await page.goto(urlForSpec(KINGS_AT_THE_SEAM, 'white', TOKEN_ALL_ON))
    await select(page, 'b1')

    await expect(page.getByTestId(hintTestId('a1'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('a2'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('c1'))).toHaveCount(1)
  })

  test('...and clicking that square anyway does not move the king', async ({ page }) => {
    // The hint is guidance; the reducer is the rule. Both have to refuse.
    await page.goto(urlForSpec(KINGS_AT_THE_SEAM, 'white', TOKEN_ALL_ON))
    await select(page, 'b1')
    await page.getByTestId(squareTestId('a1')).click()

    await expect(page.getByTestId(squareTestId('b1'))).toContainText('♔')
    await expect(page.getByTestId(squareTestId('a1'))).not.toContainText('♔')
  })

  test('the king may not step beside the enemy king from the other side of the seam', async ({ page }) => {
    // Same rule mirrored. Asserting it once is how a one-sided implementation survives.
    await page.goto(urlForSpec('w:Kg1,Pd2; b:Ka1,Pd7', 'white', TOKEN_ALL_ON))
    await select(page, 'g1')

    await expect(page.getByTestId(hintTestId('h1'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('h2'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('f1'))).toHaveCount(1)
  })

  test('a bishop forbids the squares it attacks through the seam', async ({ page }) => {
    // Black bishop on b3 reaches h4 via the a4 portal mouth and keeps sliding — g5, f6,
    // e7 (§5.1). It guards two of this king's squares from the far corner of the board.
    await page.goto(urlForSpec('w:Kg4,Pd2; b:Kd8,Bb3', 'white', TOKEN_ALL_ON))
    await select(page, 'g4')

    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('g5'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('g3'))).toHaveCount(1)
  })

  test('a knight forbids the square it attacks by wrapping the file', async ({ page }) => {
    // Black knight on a3 attacks h5, h1, g4 and g2 (§11.4).
    await page.goto(urlForSpec('w:Kg6,Pd2; b:Kd8,Na3', 'white', TOKEN_ALL_ON))
    await select(page, 'g6')

    await expect(page.getByTestId(hintTestId('h5'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('h6'))).toHaveCount(1)
  })

  test('a pawn forbids the square its capture diagonal wraps onto', async ({ page }) => {
    // A black pawn on a5 captures onto h4: the diagonals wrap, the push does not (§11.2).
    await page.goto(urlForSpec('w:Kg3,Pd2; b:Kd8,Pa5', 'white', TOKEN_ALL_ON))
    await select(page, 'g3')

    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('h3'))).toHaveCount(1)
  })

  test('an ordinary rook still defends the squares the king would cross to', async ({ page }) => {
    // The crossing is the seam's; the defence is plain chess down the h-file. The rule
    // only bites when both halves meet.
    await page.goto(urlForSpec('w:Ka4,Pd2; b:Kd8,Rh8', 'white', TOKEN_ALL_ON))
    await select(page, 'a4')

    await expect(page.getByTestId(hintTestId('h4'))).toHaveCount(0)
    await expect(page.getByTestId(hintTestId('b4'))).toHaveCount(1)
  })

  test('with only the king crossing, the enemy king still guards the far side', async ({ page }) => {
    // One flag on, five off: the rule is per piece, and the king's own flag is enough.
    await page.goto(urlForSpec(KINGS_AT_THE_SEAM, 'white', KING_ONLY))
    await select(page, 'b1')

    await expect(page.getByTestId(hintTestId('a1'))).toHaveCount(0)
  })

  test('with the king flag off, a1 is an ordinary square again', async ({ page }) => {
    // Sliders-only: the kings do not cross, so a1 and h1 are not adjacent at all and the
    // step is legal. The contrast is the point — the rule removes a crossing, not a square.
    await page.goto(urlForSpec(KINGS_AT_THE_SEAM, 'white', TOKEN_SLIDERS_ONLY))
    await select(page, 'b1')

    await expect(page.getByTestId(hintTestId('a1'))).toHaveCount(1)
  })

  test('a non-standard ruleset from a shared link still loads and plays', async ({ page }) => {
    // ADR 0004: a token's meaning is fixed forever. `2:--------k--` is the king
    // quiet-only ruleset §2.1 retired — no longer offered, but an old link must not break.
    // Here the kings *may* stand adjacent, which is precisely why it is not standard.
    await page.goto(urlForSpec(KINGS_AT_THE_SEAM, 'white', '2:--------k--'))
    await select(page, 'b1')

    await expect(page.getByTestId(hintTestId('a1'))).toHaveCount(1)
  })
})
