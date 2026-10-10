# Bug — the board jumps between moves, because the text above it changes height

> **Status: DONE (2026-10-10).** Fixed, with a regression suite that was proved able to
> fail: [`layout-shift.e2e.ts`](./layout-shift.e2e.ts). Two of the five things this story
> suspected turned out to be false — see §6, which is the part worth reading.
> Part of the [quality epic](./README.md). Caused by
> [`../balance/watch-a-game.md`](../balance/watch-a-game.md), shipped the day before.
> Fix alongside [`responsive-design-pass.md`](./responsive-design-pass.md), which covers
> the same surfaces.

## 1. What happens

On the watch screen the gauge above the board is **one line** for some positions and
**three** for others, so the board and every control below it jump up and down **between
moves** — several times a second while a game runs. At three lines the Play / Step / Reset
buttons are pushed off the bottom of a phone screen entirely.

| One line (`1 of 39`) | Three lines (`3 of 25`) |
| --- | --- |
| ![board sits high, controls visible](./images/layout-shift-one-line.jpg) | ![board pushed down, controls clipped](./images/layout-shift-three-lines.jpg) |

## 2. Root cause

`SelfPlayScreen.tsx` renders an explanatory sentence **conditionally**:

```tsx
<strong>{gauge}</strong>
{diagnostics.indistinguishable > 1 && (
  <span className="selfPlayHint"> — the evaluation has no preference here, …</span>
)}
```

`indistinguishable` is `1` whenever the evaluation finds a single best move and `> 1`
otherwise — which flips constantly during a game. So a block **above** the board changes
between one and three rendered lines on most moves, and everything below it moves.

The gauge text itself also varies in width (`3 of 25` vs `1 of 39`), which is harmless on
its own; it is the wrapped line count that moves the board.

> **The general shape, worth more than the fix:** *anything above the primary content whose
> presence or height is conditional will move the primary content.* The board is the thing
> a player is aiming a thumb at.

## 3. Why no test caught it — and why the screenshot did not either

`check:a11y` measures the board's box at four widths and passed, because it measures **one
state**. The e2e suite asserts on text and testids, never on position.

The sharper point: **this screen was screenshotted before it shipped, and the screenshot
was looked at.** It showed the three-line state, and it looked fine — because a layout
shift is not a property of a layout, it is a property of a **transition**.

> **A screenshot proves a layout. Two screenshots prove a transition.** For anything that
> re-renders on a timer or on live data, capture it in at least two states and compare the
> geometry, not the pixels.

## 4. What was done

The owner's instruction, 2026-10-10:

> "We want to be intelligent, pre-allocate an area, and if that text overflows we can allow
> a tap to view all of it on mobile. Same with the step count."

- [x] **Reserve the space.** [`src/components/ReservedText/`](../../../src/components/ReservedText/ReservedText.tsx)
      holds a fixed number of lines whatever is inside it. One custom property,
      `--reserved-lines`, drives **both** the space held and the line the text is clamped
      at, because a reserve in px beside a clamp in lines is a pair that drifts.
- [x] **Clamp and expand.** Past the reserve the text clamps and a disclosure appears —
      a real `<button>` with `aria-expanded` and `aria-controls`, so it works by touch and
      by keyboard, and Escape closes it. Expanding **overlays** what follows rather than
      reflowing it: text that expands by pushing the board down has only traded one shift
      for a worse one.
- [x] **The move log.** `height: 30vh`, not `max-height` — it used to grow a row at a time.
- [x] **Audit of every other conditional block.** Three found, two fixed, one deliberately
      left: see §5.
- [x] **A regression test that can fail**, in
      [`layout-shift.e2e.ts`](./layout-shift.e2e.ts) — and *proved* to fail, by restoring
      the old geometry one rule at a time and watching each test go red.

### What the reserve is, and why the gauge needed more than one

The headline fix is not the reserve. It is that **the sentence is now always present**:
`gaugeNote()` returns text in all three states rather than rendering only while moves are
tied. Reserving space for a conditional block pads over the conditional; saying something
in every state removes it. The reserve then handles the residual two-versus-three-line
wrap.

| Region | Lines held | Measured longest content |
| --- | --- | --- |
| Watch gauge | 3 | 3 lines at every width 320–900px |
| Puzzle prompt | 2 | 2 lines, both extremes of the 248-puzzle set |
| Board message | 2 | 2 lines at ≤390px, 1 at desktop widths |
| Submit bar slot | 3rem | 35px bar, reserved only while confirm-before-move is on |

## 5. The audit, including what was left alone

- **Watch title** — was `Engine vs engine · ${describeStatus(…)}`, which wraps to two lines
  on a phone for the longer statuses. Now a constant string: the status was already shown
  in full in the live region below the board, so this was a **duplicate that changed
  height**, which is strictly worse than no duplicate.
- **Puzzle verdict and reveal** — below the board, and the reveal is the payoff for
  solving. Reserving space for it would leave a permanent hole on every unsolved puzzle.
  Deliberately left: the owner's rule is about what sits *above* the primary content.
- **Saved-games list and opponent controls** — below everything; nothing moves when they
  change.

## 6. What this story got wrong

Two of its own claims did not survive being measured, and both are more useful than the fix.

**The puzzle screen was never shifting.** §5 suspected it. Across all 248 committed puzzles
the prompt is 77–83 characters and renders as exactly two lines at every width from 320px
up — the material and ruleset strings are far more uniform than they look. The reserve went
in anyway, at **two** lines rather than the three originally written, because a third line
is 21.6px of dead space above the board on every puzzle. *That* is what reserving by
guesswork costs, and it is the argument for measuring first.

**Three of the five regression tests passed against the unfixed app.** Written the obvious
way — "the footer did not move" — they were green, and the bug was still there. `.app` has
a `1fr` grid row that silently absorbs a block growing by 20px, and keeps absorbing until
the page runs out of slack, at which point everything below moves at once.

> **A layout shift measured downstream is measured through a shock absorber.** Assert the
> height of the block that grew, not the position of something below it. The downstream
> assertion is still worth making — it is the user-visible promise — but it cannot be the
> only one, and on a desktop-sized viewport it will quietly pass forever.

That is also the honest answer to "why did this reach a phone and not a desktop": the
desktop had slack and the phone did not.

**One test cannot currently fail**, and says so: the puzzle one, which guards a property
that already holds. The watch-mode note test drives the text from the test rather than the
engine, because no URL can put the engine in a position where its evaluation has a
preference — reaching one takes minutes of real play, which is precisely why this went
unnoticed until someone played on a phone.

## 7. Notes

- Both screenshots are in dark theme on a real phone, which is also where the header takes
  two rows and eats vertical space — see
  [`responsive-design-pass.md`](./responsive-design-pass.md) §1.
- The disclosure control was first styled in `--accent-color`, which is 9.6:1 on the dark
  background and **1.9:1 on the light one**. A light-theme screenshot caught it; it now
  uses the text colour and keeps the underline.
- The reserve means the disclosure is dormant in normal use — it appears when the text
  genuinely exceeds its space, which on this screen takes a root font size around 26px.
  That path is covered in a real browser rather than only in jsdom.
