# Bug — the board is clipped and off-centre on a phone

> **Status: BACKLOG — root cause found and measured 2026-10-03.** Part of the
> [quality epic](./README.md). Reported by the owner from a real phone; reproduced and
> diagnosed against the running app.

## 1. What it looks like

On a phone the board sits too far right, and at narrow widths the **h-file is cut off**.
The owner's screenshot shows it plainly: a wide left margin, and the board running past the
right edge of the screen.

Measured against the built app:

| Viewport | Board spans | Left gap | Right gap | Result |
| --- | --- | --- | --- | --- |
| 360px | 85 … 369 | 85 | **−9** | **h-file clipped** |
| 390px | 73 … 381 | 73 | 9 | visibly off-centre |
| 412px | 64 … 390 | 64 | 22 | visibly off-centre |

## 2. Root cause

**The header's `.actions` row is 454px wide and does not wrap.**

It holds four controls — *Puzzles*, *Reset*, *Save Game*, and the theme toggle — laid out in
a row with no wrapping. 454px becomes the app's minimum content width, so `.app`, the
footer and the move message all stretch to 454px on a 360px screen. The board, which is
sized correctly (`--cell: min(10vw, 56px)` → 288px at 360px, which fits), is then centred
**inside the 454px container** rather than inside the viewport. That is the 85px left gap
and the 9px of board hanging off the right.

The board is not too big. **It is centred in the wrong box.**

## 3. Why no test caught it

`npm run check:a11y` asserts "no horizontal overflow" by comparing
`documentElement.scrollWidth` to `clientWidth` — and that check **passes**, because the
overflow is *clipped* rather than scrollable (`.board` has `overflow: hidden`, and the
document never grows). The page cannot be scrolled sideways, so by that measure nothing
overflows; meanwhile a rank of the board is invisible.

That is the third time this session a check passed while the thing was visibly wrong, and
the second time a **screenshot** was what found it. The lesson is already in CLAUDE.md
("look at the thing"); what this adds is the sharper version for layout:

> **Measure the element you care about, not the document.** "Does the page scroll
> sideways?" and "can I see the whole board?" are different questions, and only the second
> one matters to a player.

## 4. Acceptance Criteria

- [ ] At 320, 360, 390 and 412px the **whole board is visible** — `h1`'s right edge is
      inside the viewport and `a1`'s left edge is at or after 0.
- [ ] The board is **centred**: left and right gaps equal within 2px. ("Everything
      symmetrical", in the owner's words.)
- [ ] The header actions wrap rather than setting a minimum width — or collapse to icons /
      a menu at narrow widths.
- [ ] `check:a11y` gains a **board-visibility** check that compares the board's own bounding
      box to the viewport, at each width above. The existing document-overflow check stays;
      it was not wrong, it was answering a different question.
- [ ] Verified by **screenshot** at 360px, in both themes, not only by assertion.
- [ ] No regression at desktop widths, where the layout is currently fine.

## 5. Notes for whoever picks this up

- `--cell: min(10vw, 56px)` is sound; resist changing it first. The sizing is not the bug.
- Check the footer and `.moveMessage` too — both were measured at 454px and will re-centre
  once the actions row wraps.
- The puzzle screen shares the header, so it has the same defect and the same fix.
