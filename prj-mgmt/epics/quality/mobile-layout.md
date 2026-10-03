# Bug — the board is clipped and off-centre on a phone

> **Status: DONE (2026-10-03)** for the clipping and centring; two cosmetic follow-ups in
> §6. Fixed by letting the header wrap, and locked behind `npm run check:a11y`, which now
> measures the **board's** box rather than the document's. Part of the
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

- [x] At 320, 360, 390 and 412px the **whole board is visible**. Measured after the fix:
      `34..286`, `38..322`, `41..349`, `43..369` — every one inside its viewport.
- [x] The board is **centred**: gaps equal to the pixel at all four widths (34/34, 38/38,
      41/41, 43/43), against 85/−9 before.
- [x] The header actions wrap (`flex-wrap`), plus `min-width: 0` on `.app > *` so no child
      can force the column wider than the screen again.
- [x] `check:a11y` measures the **board's** bounding box against the viewport at each width
      — 8 new checks, 26 in total. The document-overflow check stays; it was not wrong, it
      was answering a different question.
- [x] Verified by screenshot at 360px, not only by assertion.
- [x] No desktop regression — the full e2e suite passes at its usual viewport.

## 5. One more thing the fix exposed

`check:a11y` defaulted to `localhost:5173`, and on this machine another project now serves
that port. The first run after the fix spent 30 seconds hunting for a chessboard inside a
maze app before timing out. It now checks what is actually there and says so:

```
No Mirror Chess board at http://localhost:5173 — the page there is titled "Maze Lab".
```

A check that fails for an environment reason should say which, or the next person debugs
the wrong thing.

## 6. Cosmetic follow-ups, seen in the screenshot

- **A tall dead gap** between the board and the status line on a phone: `.app` is a grid
  with a `1fr` middle row, so the footer is pushed to the bottom of a tall viewport.
  **Still open**, and still harmless.
- [x] **File labels overlap the rank-1 pieces.** ✅ **Fixed 2026-10-03.** Filed as cosmetic,
  and it stopped being cosmetic the moment a puzzle put its key piece on `a1`: the bishop a
  player has to find was drawn underneath a letter `A` of the same weight. Seen in a
  screenshot again, not in a test.

  The fix keeps the labels inside the squares — moving them outside would cost the board
  its square aspect at 320px, which is the constraint this whole story exists to protect —
  and makes them **recede** instead: `opacity: 0.55`, `z-index: 0`, and `z-index: 1` on the
  glyph so a piece always wins. Verified by screenshot at 390px.

  > The general version, worth more than the fix: **"cosmetic" is a judgement about the
  > content that happened to be on screen when you looked.** This one was judged against
  > the opening position, where rank 1 is a row of pieces a player already knows.

## 7. Notes for whoever picks this up

- `--cell: min(10vw, 56px)` is sound; resist changing it first. The sizing is not the bug.
- Check the footer and `.moveMessage` too — both were measured at 454px and will re-centre
  once the actions row wraps.
- The puzzle screen shares the header, so it has the same defect and the same fix.
