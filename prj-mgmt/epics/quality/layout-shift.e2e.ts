import { test, expect, type Page } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import {
  squareTestId,
  hintTestId,
  GAME_STATUS_TESTID,
  MOVE_MESSAGE_TESTID,
  SUBMIT_BAR_TESTID,
  SUBMIT_BAR_SLOT_TESTID,
  RESERVED_TEXT_MORE_CLASS,
  WATCH_GAUGE_TESTID,
  WATCH_LOG_TESTID,
  WATCH_STEP_TESTID,
  PUZZLE_PROMPT_TESTID,
  SETTINGS_OPEN_TESTID,
  SETTINGS_DIALOG_TESTID,
  SETTINGS_AUTOSUBMIT_TESTID,
  SETTINGS_CLOSE_TESTID,
} from '@shared/ui/selectors'

/**
 * THE BOARD DOES NOT MOVE — bug: [`layout-shift.md`](./layout-shift.md).
 *
 * **Why these are e2e and not assertions in a component test.** A layout shift is a
 * property of the *change between two layouts*, and jsdom has no layout at all: every box
 * there is zero pixels tall, so nothing in the unit or integration tiers can see this bug
 * even in principle. `ReservedText.spec.tsx` proves the behaviour; only a real browser can
 * prove the geometry.
 *
 * **Why not `check:a11y`, which the story nominated.** That script measures the board at
 * four widths and is the natural home for *one-state* geometry — but it needs a built app
 * and a server started by hand, and is deliberately outside the normal gate. A regression
 * net that does not run on the way to a commit is not a net. This file runs with every
 * other e2e.
 *
 * **Every test here compares document coordinates**, not viewport ones: a page that scrolls
 * changes `getBoundingClientRect().top` for reasons that have nothing to do with layout.
 *
 * **And every test asserts on a HEIGHT, not only on a position.** Written the obvious way
 * — "the footer did not move" — three of these passed against the unfixed app, because
 * `.app` has a `1fr` grid row that silently absorbs a block growing by 20px and keeps
 * absorbing until the page runs out of slack, at which point everything below moves at
 * once. That is why the bug reached a phone and not a desktop. The height of the block
 * that grew is the invariant with no hiding place; the positions below it are the
 * consequence worth stating too.
 */
const PHONE = { width: 360, height: 780 }

interface Box {
  readonly top: number
  readonly left: number
  readonly height: number
}

async function boxOf(page: Page, testId: string): Promise<Box> {
  const box = await page.evaluate(id => {
    const el = document.querySelector(`[data-testid="${id}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: Math.round(r.top + window.scrollY), left: Math.round(r.left), height: Math.round(r.height) }
  }, testId)
  expect(box, `nothing on the page with data-testid="${testId}"`).not.toBeNull()
  return box!
}

/** How tall the document is — the measurement that catches a block *below* everything. */
const pageHeight = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollHeight)

const openSettings = async (page: Page) => {
  await page.getByTestId(SETTINGS_OPEN_TESTID).click()
  await expect(page.getByTestId(SETTINGS_DIALOG_TESTID)).toBeVisible()
}

test.describe('mirror-chess: the page holds still', () => {
  test('watch mode: the board stays put while the engines play', async ({ page }) => {
    // Four real searches through the worker. Slow, and worth it: this is the screen the
    // bug was reported from.
    test.setTimeout(180_000)
    await page.setViewportSize(PHONE)
    await page.goto('/?mode=watch')
    await expect(page.getByTestId(squareTestId('a8'))).toBeVisible()

    const board = await boxOf(page, squareTestId('a8'))
    const gauge = await boxOf(page, WATCH_GAUGE_TESTID)
    const log = await boxOf(page, WATCH_LOG_TESTID)

    const rows = page.locator(`[data-testid="${WATCH_LOG_TESTID}"] li`)
    for (let played = 1; played <= 4; played++) {
      await page.getByTestId(WATCH_STEP_TESTID).click()
      await expect(rows).toHaveCount(played, { timeout: 40_000 })

      expect(await boxOf(page, squareTestId('a8')), `the board moved after ${played} moves`)
        .toEqual(board)
      expect((await boxOf(page, WATCH_GAUGE_TESTID)).height,
        `the gauge changed height after ${played} moves`).toBe(gauge.height)
      // The deterministic half: the log gains a row on every move whatever the engine
      // chooses, and it used to be sized with `max-height`, so it grew a row at a time.
      expect((await boxOf(page, WATCH_LOG_TESTID)).height,
        `the move log grew after ${played} moves`).toBe(log.height)
    }
  })

  test('watch mode: whatever the note above the board says, the board does not move', async ({ page }) => {
    /*
     * The reported transition, driven directly.
     *
     * The gauge's sentence depends on whether the evaluation can separate the moves in the
     * *current* position, and nothing in a URL can put the engine in a chosen position —
     * reaching one takes minutes of real play, which is why this went unnoticed until a
     * phone found it. So the text is set from the test. That is deliberately testing the
     * **reserve**, not the wording: the claim is that whatever that region says, including
     * something longer than any sentence the screen can produce, the board below it stays
     * where it is.
     */
    await page.setViewportSize(PHONE)
    await page.goto('/?mode=watch')
    await expect(page.getByTestId(squareTestId('a8'))).toBeVisible()
    const board = await boxOf(page, squareTestId('a8'))

    for (const note of [
      '1 of 39 moves indistinguishable',
      '',
      '20 of 20 moves indistinguishable — the evaluation has no preference here, so the '
      + 'move is chosen by search depth alone, and this sentence is longer than any the '
      + 'screen can actually produce, which is the point of asserting on it.',
    ]) {
      await page.evaluate(([id, text]) => {
        document.querySelector(`[data-testid="${id}"]`)!.textContent = text
      }, [WATCH_GAUGE_TESTID, note] as const)
      await page.waitForTimeout(100)
      expect(await boxOf(page, squareTestId('a8')), `the board moved for: "${note}"`)
        .toEqual(board)
    }
  })

  test('the game screen: explaining a tap does not move anything', async ({ page }) => {
    // Both real messages wrap to two lines at phone widths, and `min-height: 1.25rem` held
    // one — so the footer, the opponent controls and the saved-game list all jumped a line
    // whenever the board said anything.
    await page.setViewportSize(PHONE)
    await page.goto(urlForSpec('w:Ke1,Re2; b:Re8,Pa7', 'white'))

    const board = await boxOf(page, squareTestId('a8'))
    const silent = await boxOf(page, GAME_STATUS_TESTID)
    const empty = await boxOf(page, MOVE_MESSAGE_TESTID)

    // A preview: tapping the other side's pawn. Two lines at this width.
    await page.getByTestId(squareTestId('a7')).click()
    await expect(page.getByTestId(MOVE_MESSAGE_TESTID)).toContainText('cannot play it')
    expect((await boxOf(page, MOVE_MESSAGE_TESTID)).height,
      'the message line grew to fit a preview').toBe(empty.height)
    expect(await boxOf(page, GAME_STATUS_TESTID), 'a preview message moved the page')
      .toEqual(silent)

    // A refusal: the rook on e2 is pinned by the rook on e8, so d2 is forbidden.
    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(squareTestId('d2')).click()
    await expect(page.getByTestId(MOVE_MESSAGE_TESTID)).toContainText('leave your king in check')
    expect((await boxOf(page, MOVE_MESSAGE_TESTID)).height,
      'the message line grew to fit a refusal').toBe(empty.height)
    expect(await boxOf(page, GAME_STATUS_TESTID), 'a refusal moved the page').toEqual(silent)
    expect(await boxOf(page, squareTestId('a8')), 'the board moved').toEqual(board)
  })

  test('confirm-before-move: a waiting move does not push the page down', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(urlForSpec('w:Ke1,Pe2; b:Ke8,Pa7', 'white'))
    await openSettings(page)
    await page.getByTestId(SETTINGS_AUTOSUBMIT_TESTID).uncheck()
    await page.getByTestId(SETTINGS_CLOSE_TESTID).click()

    // Measured *after* the setting change: turning confirmation on is a deliberate act and
    // is allowed to change the layout once. Every move afterwards is not.
    const before = await boxOf(page, GAME_STATUS_TESTID)
    const slot = await boxOf(page, SUBMIT_BAR_SLOT_TESTID)

    await page.getByTestId(squareTestId('e2')).click()
    await page.getByTestId(hintTestId('e4')).click()
    await expect(page.getByTestId(SUBMIT_BAR_TESTID)).toBeVisible()

    expect((await boxOf(page, SUBMIT_BAR_SLOT_TESTID)).height,
      'the space for the submit bar grew when a move was held').toBe(slot.height)
    expect(await boxOf(page, GAME_STATUS_TESTID), 'the submit bar pushed the page down')
      .toEqual(before)
  })

  test('puzzles: the board sits at the same height on every puzzle', async ({ page }) => {
    // The two extremes of the committed set, by prompt length: 77 characters and 83.
    // Measured rather than assumed — see the note in `PuzzleScreen.tsx`.
    await page.setViewportSize(PHONE)

    await page.goto('/?mode=puzzles&puzzle=0ozxdl9')
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('KQ-K')
    const shortest = await boxOf(page, squareTestId('a8'))

    await page.goto('/?mode=puzzles&puzzle=13slaga')
    await expect(page.getByTestId(PUZZLE_PROMPT_TESTID)).toContainText('KRB-KP')
    expect(await boxOf(page, squareTestId('a8')), 'the board moved between puzzles')
      .toEqual(shortest)
  })

  test('reading a clamped note overlays the board rather than shoving it down', async ({ page }) => {
    // At 320px with a 26px root font the gauge genuinely exceeds its three lines, which is
    // the only state where the disclosure appears at all. Expanding by reflow would have
    // traded a small shift for a large one.
    await page.setViewportSize({ width: 320, height: 780 })
    await page.goto('/?mode=watch')
    await page.evaluate(() => { document.documentElement.style.fontSize = '26px' })

    const more = page.locator(`.${RESERVED_TEXT_MORE_CLASS}`)
    await expect(more).toBeVisible()
    const board = await boxOf(page, squareTestId('a8'))

    await more.click()
    await expect(more).toHaveAttribute('aria-expanded', 'true')
    expect(await boxOf(page, squareTestId('a8')), 'expanding the note moved the board')
      .toEqual(board)
  })
})
