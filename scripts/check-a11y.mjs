/**
 * ACCESSIBILITY CHECK — run the 2026-09-27 pass again, against the built app.
 *
 * **What is this?** The checks that pass found, made repeatable: headings, accessible
 * names, live regions, keyboard operability, contrast, and mobile overflow — measured in a
 * real browser rather than read off the source.
 *
 * **Why is it here?** Because the first run of that pass produced a *false* finding — it
 * reported "the board is not keyboard-operable" when the fifth Tab had simply landed on an
 * empty square. A script that focuses a square known to hold a piece cannot make that
 * mistake twice, and the next pass starts from evidence instead of from scratch.
 *
 * Usage:
 *   npm run preview        # in another terminal
 *   node scripts/check-a11y.mjs
 *
 * Exits non-zero when a check fails, so it can be wired into CI later. It deliberately
 * does **not** run in the normal test suite: it needs a built app and a live server, and a
 * check that is slow and environment-dependent gets disabled rather than fixed.
 */
import { chromium } from '@playwright/test'

const BASE = process.env.A11Y_BASE ?? 'http://localhost:5173'
const failures = []
const notes = []

const check = (ok, label, detail) => {
  if (ok) notes.push(`  ok    ${label}${detail ? ` — ${detail}` : ''}`)
  else failures.push(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
}

/** WCAG relative luminance contrast ratio between two computed colours. */
const CONTRAST_IN_PAGE = `(fg, bg) => {
  const lum = (c) => {
    const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const parse = (s) => (s.match(/\\d+(\\.\\d+)?/g) || []).slice(0, 3).map(Number)
  const a = lum(parse(fg)), b2 = lum(parse(bg))
  const [hi, lo] = a > b2 ? [a, b2] : [b2, a]
  return (hi + 0.05) / (lo + 0.05)
}`

async function auditScreen(page, url, label) {
  await page.goto(url)
  const r = await page.evaluate((contrastSrc) => {
    const contrast = eval(contrastSrc)
    const bgOf = (el) => {
      let e = el
      while (e) {
        const c = getComputedStyle(e).backgroundColor
        if (c && c !== 'rgba(0, 0, 0, 0)') return c
        e = e.parentElement
      }
      return 'rgb(255,255,255)'
    }
    const nameOf = (el) =>
      el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
      (el.textContent || '').trim() || el.getAttribute('title') || ''

    const interactive = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')]
    const status = document.querySelector('[data-testid="game-status"]') ??
      document.querySelector('[data-testid="puzzle-verdict"]')

    return {
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => h.tagName),
      unnamed: interactive.filter(el => !nameOf(el))
        .map(el => `${el.tagName}.${String(el.className).split(' ')[0]}`),
      liveRegions: [...document.querySelectorAll('[aria-live]')].map(e => e.getAttribute('data-testid') || e.tagName),
      lang: document.documentElement.lang,
      statusContrast: status ? contrast(getComputedStyle(status).color, bgOf(status)) : null,
      overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  }, CONTRAST_IN_PAGE)

  check(r.headings.length > 0, `${label}: has at least one heading`, r.headings.join(',') || 'none')
  check(r.headings.includes('H1'), `${label}: has an h1`)
  // One known exception: Ionic renders an internal `input.aux-input` with no name.
  const unnamed = r.unnamed.filter(n => !n.startsWith('INPUT.aux-input'))
  check(unnamed.length === 0, `${label}: every interactive element has a name`, unnamed.join(', '))
  check(r.liveRegions.length > 0, `${label}: has a live region`, r.liveRegions.join(','))
  check(r.lang === 'en', `${label}: document language is set`, r.lang)
  check(r.statusContrast === null || r.statusContrast >= 4.5,
    `${label}: status text meets AA (4.5:1)`, r.statusContrast?.toFixed(2))
  check(!r.overflows, `${label}: no horizontal overflow`)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } })

  await auditScreen(page, `${BASE}/`, 'game')
  await auditScreen(page, `${BASE}/?mode=puzzles`, 'puzzles')

  // Keyboard operability: focus a square that HOLDS A PIECE, then activate it. Tabbing
  // blindly lands on an empty square and proves nothing — that is the false finding this
  // script exists to prevent.
  await page.goto(`${BASE}/`)
  await page.locator('[data-testid="square-e2"]').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  const hints = await page.locator('[data-testid^="hint-"]').count()
  check(hints > 0, 'keyboard: activating a piece by keyboard offers its moves', `${hints} hints`)

  await page.locator('[data-testid="square-e4"]').focus()
  await page.keyboard.press('Enter')
  await page.waitForTimeout(200)
  const moved = (await page.locator('[data-testid="square-e4"]').textContent()) ?? ''
  check(moved.includes('♙'), 'keyboard: a whole move completes without a mouse')

  // The reveal is the product's payoff; it must be announced, not merely rendered.
  await page.goto(`${BASE}/?mode=puzzles&puzzle=1b53rpm`)
  await page.locator('[data-testid="square-f8"]').click()
  await page.locator('[data-testid="square-c4"]').click()
  await page.waitForTimeout(200)
  const revealLive = await page.getAttribute('[data-testid="puzzle-reveal"]', 'aria-live')
  check(revealLive === 'polite', 'puzzles: the reveal is announced', revealLive ?? 'none')

  // Mobile width, where the board competes with everything else for space.
  await page.setViewportSize({ width: 360, height: 780 })
  await page.waitForTimeout(200)
  const narrowOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  check(!narrowOverflow, 'puzzles: no horizontal overflow at 360px')
} finally {
  await browser.close()
}

console.log([...notes, ...failures].join('\n'))
console.log(failures.length === 0
  ? `\n${notes.length} accessibility checks passed.`
  : `\n${failures.length} of ${notes.length + failures.length} accessibility checks FAILED.`)
process.exit(failures.length === 0 ? 0 : 1)
