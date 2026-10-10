# Story — A responsive, legible, accessible pass over the whole interface

> **Status: BACKLOG — asked for by the owner, 2026-10-10.** Part of the
> [quality epic](./README.md). Do this *with*
> [`layout-shift.md`](./layout-shift.md), which is the sharpest instance of it and has the
> screenshots.

## Summary

As a player on a phone, a laptop and a desktop, I want the interface to use the space it
has, hold still while I use it, and be navigable without a mouse — so that the game is
pleasant to play rather than merely correct.

> The owner's framing, and worth keeping because it sets the bar: *"The functionality is
> great."* This is not a rescue. It is the pass that makes a working thing feel finished.

## 1. What is wrong today, from the owner's own screenshots

All four observations are from a real phone in dark theme, 2026-10-10:

| Problem | Evidence |
| --- | --- |
| **The board jumps between moves** | [`layout-shift.md`](./layout-shift.md) — its own bug |
| **The header takes two rows** and eats ~20% of the viewport before anything useful | Puzzles / Play a game / gear wrap, then the Dark Theme toggle drops to a second row |
| **Controls fall below the fold** on the watch screen when the gauge is three lines | Play / Step / Reset clipped by the browser chrome |
| **A tall dead gap** between the board and the status line on a tall viewport | Known since 2026-10-03, `mobile-layout.md` §6 — still open, and it is what pushes the controls down |

## 2. Scope

- [ ] **A layout that holds still.** Reserve space for anything that changes; see
      `layout-shift.md`. Nothing above the board may be conditionally present.
- [ ] **A header that fits one row on a phone.** Four controls and a toggle is too many
      words. Options worth measuring rather than guessing between: icons with accessible
      names, an overflow menu, or moving mode-switching into a bottom bar where a thumb
      already is.
- [ ] **Use the width on a laptop and desktop.** Today everything is a single centred
      column at every size, so a 1440px screen shows a small board and a lot of nothing.
      The watch screen in particular wants the log *beside* the board, not under it.
- [ ] **The dead vertical gap**, from `mobile-layout.md` §6: `.app` is a grid with a `1fr`
      middle row, so the footer is pushed to the bottom of a tall viewport.
- [ ] **One visual language.** Three screens have grown three button rows
      (`.actions`, `.selfPlayControls`, `.submitBar`) with similar-but-not-identical
      styling. Reconcile deliberately.
- [ ] **Accessibility beyond the board.** The board itself is in good shape — keyboard
      operable, labelled, contrast well above AA (`README.md`). The *rest* of the page has
      had less attention: focus order across the new dialogs and screens, visible focus on
      every control, and heading structure now that there are three screens.
- [ ] **Both themes, checked on a device.** Every screenshot that found a bug this month
      was taken in dark theme on a phone; the desktop light-theme screenshots found none of
      them.

## 3. How to judge it

**Measure, do not eyeball.** `scripts/check-a11y.mjs` already measures the board's box at
320 / 360 / 390 / 412px and has caught real regressions. Extend it rather than starting
something new:

- the board's box at **desktop** widths too, so "a small board in a big window" becomes a
  number;
- **no element above the board changes height** across a sequence of moves (the
  layout-shift regression test);
- **every interactive control is reachable by keyboard** on each of the three screens, with
  a visible focus ring.

## 4. Notes

- `mobile-layout.md` is the precedent and the method: it found its bug by measuring *the
  board's* box rather than the document's, and that distinction is the reason it caught
  something `check:a11y` had been passing over.
- Resist re-sizing `--cell: min(10vw, 56px)` first. It was the suspect last time and was
  not the bug; the bug was what the board was centred *inside*.
