import { test, expect, type Page } from '@playwright/test'
import { urlForSpec } from '@shared/boards'
import { GAME_STATUS_TESTID, hintTestId, squareTestId } from '@shared/ui/selectors'
import { TOKEN_ALL_ON, TOKEN_STANDARD_CHESS } from '@game/rules'

/**
 * THE CAPABILITY MATRIX — every piece, every basic thing it can do, in the real UI.
 * Oracle: `prj-mgmt/epics/rules/mirror-portal-spec.md` §4, §11, §12.2 and §2.1.
 * Story: [`piece-capabilities.md`](./piece-capabilities.md).
 *
 * The rest of the e2e suite grew case by case and covers what each story happened to
 * need: the bishop is well covered, the rook and queen were barely covered at all, and
 * almost nothing *executed* a capture across the seam. This file is deliberately
 * systematic instead — for each of the six pieces it asserts four capabilities:
 *
 * | | ordinary | across the seam |
 * | --- | --- | --- |
 * | **move** | it reaches an empty square | it reaches an empty square on the far side |
 * | **capture** | it takes an enemy | it takes an enemy on the far side, and the board changes |
 *
 * plus a **control** — with the piece's flag off, the seam destination is gone and the
 * ordinary one remains. The control is what proves the seam is doing the work rather
 * than the test agreeing with itself.
 *
 * Every assertion reads the square's **accessible name**, which carries the exact kind
 * (`legal move`, `legal capture`, `legal mirror move through the seam`, `legal mirror
 * capture through the seam`). So each test checks the rule and the a11y contract at once,
 * and a marker that looked right but announced the wrong thing would fail here.
 *
 * **Fixtures carry a spare pawn each** — two lone kings are insufficient material, the
 * game is already drawn, no hints render, and an absence assertion would pass without
 * testing anything (CLAUDE.md §8). Every fixture below was verified against the engine
 * before being written down: none leaves White in check, and none offers a king capture.
 */

/** The hint kinds a square's accessible name can end with. */
const ORDINARY_MOVE = /, legal move$/
const ORDINARY_CAPTURE = /, legal capture$/
const SEAM_MOVE = /, legal mirror move through the seam$/
const SEAM_CAPTURE = /, legal mirror capture through the seam$/

const select = async (page: Page, square: string) => {
  await page.getByTestId(squareTestId(square)).click()
}

/** Assert what the board says about a destination, by its accessible name. */
const expectHint = async (page: Page, square: string, kind: RegExp) => {
  await expect(page.getByTestId(squareTestId(square))).toHaveAttribute('aria-label', kind)
}

const expectNoHint = async (page: Page, square: string) => {
  await expect(page.getByTestId(hintTestId(square))).toHaveCount(0)
}

interface Capability {
  readonly piece: string
  readonly glyph: string
  /** Moving: one spec, with an ordinary destination and one across the seam. */
  readonly move: { readonly spec: string; readonly from: string; readonly ordinary: string; readonly seam: string | null }
  readonly captureOrdinary: { readonly spec: string; readonly from: string; readonly victim: string }
  readonly captureSeam: { readonly spec: string; readonly from: string; readonly victim: string }
}

/**
 * Fixtures, all verified against the engine first.
 *
 * The sliders need a blocker to show anything interesting: on an **empty** rank a rook's
 * portal adds nothing, because every square it reaches the long way round it already
 * reaches directly and dedupe keeps the standard move (spec §5.3). The own pawn on `c4`
 * is what makes the far side reachable only through the seam.
 */
const PIECES: readonly Capability[] = [
  {
    piece: 'bishop',
    glyph: '♗',
    // Ray (-1,+1) from c1 reaches the empty edge a3, hops to h3, keeps sliding (§5.1).
    move: { spec: 'w:Ke1,Bc1,Ph2; b:Ke8,Ph7', from: 'c1', ordinary: 'd2', seam: 'h3' },
    captureOrdinary: { spec: 'w:Ke1,Bc1,Ph2; b:Ke8,Ne3,Ph7', from: 'c1', victim: 'e3' },
    captureSeam: { spec: 'w:Ke1,Bc1,Ph2; b:Ke8,Nh3,Ph7', from: 'c1', victim: 'h3' },
  },
  {
    piece: 'rook',
    glyph: '♖',
    move: { spec: 'w:Ke1,Ra4,Pc4,Ph2; b:Ke8,Ph7', from: 'a4', ordinary: 'a5', seam: 'h4' },
    captureOrdinary: { spec: 'w:Ke1,Ra4,Ph2; b:Ke8,Nc4,Ph7', from: 'a4', victim: 'c4' },
    captureSeam: { spec: 'w:Ke1,Ra4,Pc4,Ph2; b:Ke8,Nh4,Ph7', from: 'a4', victim: 'h4' },
  },
  {
    piece: 'queen',
    glyph: '♕',
    move: { spec: 'w:Ke1,Qa4,Pc4,Ph2; b:Kg8,Ph7', from: 'a4', ordinary: 'b5', seam: 'h4' },
    captureOrdinary: { spec: 'w:Ke1,Qa4,Ph2; b:Kg8,Nc4,Ph7', from: 'a4', victim: 'c4' },
    captureSeam: { spec: 'w:Ke1,Qa4,Pc4,Ph2; b:Kg8,Nh4,Ph7', from: 'a4', victim: 'h4' },
  },
  {
    piece: 'knight',
    glyph: '♘',
    // A stepper crosses by wrapping the file of its landing square, keeping the rank its
    // own move dictates (§11.2): a3 reaches h5, h1, g4 and g2.
    move: { spec: 'w:Ke1,Na3,Ph2; b:Ke8,Ph7', from: 'a3', ordinary: 'b5', seam: 'h5' },
    captureOrdinary: { spec: 'w:Ke1,Na3,Ph2; b:Ke8,Pb5,Ph7', from: 'a3', victim: 'b5' },
    captureSeam: { spec: 'w:Ke1,Na3,Ph2; b:Ke8,Ph5,Ph7', from: 'a3', victim: 'h5' },
  },
  {
    piece: 'king',
    glyph: '♔',
    move: { spec: 'w:Ka4,Ph2; b:Ke8,Ph7', from: 'a4', ordinary: 'b4', seam: 'h4' },
    captureOrdinary: { spec: 'w:Ka4,Ph2; b:Ke8,Nb4,Ph7', from: 'a4', victim: 'b4' },
    captureSeam: { spec: 'w:Ka4,Ph2; b:Ke8,Nh4,Ph7', from: 'a4', victim: 'h4' },
  },
  {
    piece: 'pawn',
    glyph: '♙',
    // `seam: null` is the rule, not a gap: a push has no file component, so it can never
    // cross (§12.4). Only the pawn's capture crosses — the row below.
    move: { spec: 'w:Ke1,Pa2,Ph2; b:Ke8,Ph7', from: 'a2', ordinary: 'a3', seam: null },
    captureOrdinary: { spec: 'w:Ke1,Pe4,Ph2; b:Ke8,Nd5,Nf5,Ph7', from: 'e4', victim: 'd5' },
    captureSeam: { spec: 'w:Ke1,Pa5,Ph2; b:Ke8,Nh6,Ph7', from: 'a5', victim: 'h6' },
  },
]

test.describe('mirror-chess: what each piece can do (the capability matrix)', () => {
  for (const p of PIECES) {
    test.describe(p.piece, () => {
      test(`${p.piece}: moves to an ordinary square`, async ({ page }) => {
        await page.goto(urlForSpec(p.move.spec, 'white', TOKEN_ALL_ON))
        await select(page, p.move.from)

        await expectHint(page, p.move.ordinary, ORDINARY_MOVE)
      })

      if (p.move.seam) {
        test(`${p.piece}: moves across the seam, and says so`, async ({ page }) => {
          await page.goto(urlForSpec(p.move.spec, 'white', TOKEN_ALL_ON))
          await select(page, p.move.from)

          await expectHint(page, p.move.seam!, SEAM_MOVE)
        })

        test(`${p.piece}: with its flag off, the far side is unreachable and the near side is not`, async ({ page }) => {
          // The control. Without it, a passing test only proves the board draws hints.
          await page.goto(urlForSpec(p.move.spec, 'white', TOKEN_STANDARD_CHESS))
          await select(page, p.move.from)

          await expectNoHint(page, p.move.seam!)
          await expectHint(page, p.move.ordinary, ORDINARY_MOVE)
        })
      } else {
        test(`${p.piece}: pushes without wrapping — a push has no file component`, async ({ page }) => {
          await page.goto(urlForSpec(p.move.spec, 'white', TOKEN_ALL_ON))
          await select(page, p.move.from)

          await expectHint(page, p.move.ordinary, ORDINARY_MOVE)
          await expectNoHint(page, 'h3')
          await expectNoHint(page, 'h2')
        })
      }

      test(`${p.piece}: captures an ordinary enemy`, async ({ page }) => {
        await page.goto(urlForSpec(p.captureOrdinary.spec, 'white', TOKEN_ALL_ON))
        await select(page, p.captureOrdinary.from)

        await expectHint(page, p.captureOrdinary.victim, ORDINARY_CAPTURE)
      })

      test(`${p.piece}: captures across the seam, and the board changes`, async ({ page }) => {
        // The one that matters most: not only offered but played, so the reducer and the
        // renderer are in it too, not just move generation.
        await page.goto(urlForSpec(p.captureSeam.spec, 'white', TOKEN_ALL_ON))
        await select(page, p.captureSeam.from)
        await expectHint(page, p.captureSeam.victim, SEAM_CAPTURE)

        await page.getByTestId(squareTestId(p.captureSeam.victim)).click()

        await expect(page.getByTestId(squareTestId(p.captureSeam.victim))).toContainText(p.glyph)
        await expect(page.getByTestId(squareTestId(p.captureSeam.from))).not.toContainText(p.glyph)
        await expect(page.getByTestId(GAME_STATUS_TESTID)).toContainText('black')
      })

      test(`${p.piece}: with its flag off, the enemy across the seam cannot be taken`, async ({ page }) => {
        await page.goto(urlForSpec(p.captureSeam.spec, 'white', TOKEN_STANDARD_CHESS))
        await select(page, p.captureSeam.from)

        await expectNoHint(page, p.captureSeam.victim)
      })
    })
  }
})

/**
 * Attack, as distinct from capture: the piece *threatens* through the seam.
 *
 * §12.2 makes attack follow capture, so these are the same right seen from the other
 * side — but check is where it becomes visible to a player, and it is the half that
 * decides games. A king that walks into a seam attack nobody rendered is the bug.
 */
test.describe('mirror-chess: every piece gives check through the seam', () => {
  const CHECKS: ReadonlyArray<readonly [string, string, string]> = [
    // [piece, spec, the square the checking piece stands on]
    ['bishop', 'w:Ke1,Bb3,Ph2; b:Kd8,Ph7', 'b3'],
    ['rook', 'w:Ke1,Ra4,Pc4; b:Kh4,Ph7', 'a4'],
    ['queen', 'w:Ke1,Qa4,Pc4; b:Kh4,Ph7', 'a4'],
    ['knight', 'w:Ke1,Na3,Ph2; b:Kh5,Ph7', 'a3'],
    ['pawn', 'w:Ke1,Pa5,Ph2; b:Kh6,Ph7', 'a5'],
  ]

  for (const [piece, spec, checker] of CHECKS) {
    test(`a ${piece} checks the king from the far side of the seam`, async ({ page }) => {
      await page.goto(urlForSpec(spec, 'black', TOKEN_ALL_ON))

      await expect(page.getByTestId(GAME_STATUS_TESTID)).toHaveText('Turn: black — check')
      await expect(page.getByTestId(squareTestId(checker))).toHaveAttribute('aria-label', /giving check/)
    })
  }
})
