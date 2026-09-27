# Story — Accessibility findings from the 2026-09-27 pass

> **Status: DONE (2026-09-27).** All three findings fixed and locked behind
> `npm run check:a11y` — 18 checks, the pass itself made repeatable. Part of the
> [quality epic](./README.md). Measured against the built app, not read off the source.

## Summary

As a player using a screen reader or a keyboard, I want the app's structure and its most
important explanation to be reachable, so that the parts already built for me are actually
usable.

## 1. What already passes, so the findings can be read in proportion

Verified on both the game and puzzle screens, light and dark:

| Check | Result |
| --- | --- |
| Board operable by keyboard | ✅ squares are real `<button>`s; **a full move completes with Tab and Enter** |
| Contrast, light | ✅ 21:1 prompt/verdict, 15.4:1 status, **6.7:1 piece glyphs** (AA needs 4.5:1, large text 3:1) |
| Contrast, dark | ✅ 17.4:1 |
| Live regions | ✅ `move-message`, `game-status`, `engine-status`, `puzzle-verdict`, all `polite` |
| Accessible names | ✅ every interactive element but one third-party Ionic internal (`input.aux-input`) |
| Landmarks | ✅ `role=main`, `role=banner` |
| `lang`, `<title>`, image alts | ✅ |
| Mobile 360px | ✅ no horizontal overflow |

A note on method: the first run of this pass reported "Enter on a square produced 0 hints"
and I nearly filed *the board is not keyboard-operable*. It was wrong — the fifth Tab had
landed on an **empty** square, so there were correctly no hints. Focusing `e2` and pressing
Enter gives 2 hints and a full move completes. **An accessibility finding is a claim about
behaviour; reproduce it deliberately before writing it down.**

## 2. Finding 1 — the app has no headings at all (MEDIUM)

`document.querySelectorAll('h1,h2,h3,h4,h5,h6')` returns **zero** elements on both screens.
`ion-title` renders inside a shadow root with no `role`, so it is not a heading.

Screen-reader users navigate long pages by heading; with none, the only way through is to
tab or read linearly. There is also no programmatic page title in the content, so "where am
I?" has no answer.

**Fix:** an `<h1>` for the app (visually hidden if the design does not want it), and an
`<h2>` for the puzzle prompt — which is already a `<header>`, so it is a one-line change.
WCAG 1.3.1 (Info and Relationships); 2.4.10 Section Headings is AAA but this is the cheap
end of it.

## 3. Finding 2 — the puzzle reveal is never announced (MEDIUM)

Solving a puzzle announces the verdict, because `puzzle-verdict` is `aria-live="polite"`:

> "Solved — that is the only move that forces mate in 2."

The **reveal** then appears — the route the piece travelled through the seam, and the reason
the puzzle is impossible in chess — with no `aria-live`, no `role`, and no focus move.
Measured: `revealAriaLive: "(none)"`, and focus stays on the square that was clicked.

So a screen-reader user hears *that* they solved it and never hears *why it was
interesting*. That is the product's entire payoff, and it is the one thing this app can say
that a chess puzzle app cannot.

**Fix:** make the reveal a polite live region, or move focus to it on solve. Prefer the live
region: moving focus would fight a keyboard player who is still on the board. Then assert it
in `PuzzleScreen.spec.tsx` the way the verdict already is.

## 4. Finding 3 — the focus ring is the 1px browser default (LOW)

`outline: auto 1px` on a board of strongly coloured squares. It satisfies WCAG 2.4.7, but
it is thin against this background. A thicker, high-contrast ring on `.sq:focus-visible`
would cost one CSS rule.

## 5. Acceptance Criteria

- [x] An `<h1>` exists on every screen (visually hidden), and the puzzle prompt is an `<h2>`.
- [x] The puzzle reveal is announced — `role="status"` + `aria-live="polite"`, not a focus
      move, so it does not fight a keyboard player still on the board.
- [x] `PuzzleScreen.spec.tsx` asserts the reveal's live region and the heading, so both
      regress loudly.
- [x] A visible focus ring on board squares: a 3px accent outline **plus** a dark inner
      ring, because an accent alone vanishes against one of `#f0d9b5` / `#b58863`.
- [x] `npm run check:a11y` re-runs the whole pass against the built app.
- [x] **Bonus, found while fixing:** the save-file import said nothing about what it
      refused. It now reports counts in a live region — an import that silently drops
      entries looks like data loss.

## 6. What we learned

**The a11y work that was already done was done at the right time.** Every visual cue got an
`aria-label` counterpart when it was built, because CLAUDE.md §7 demanded it — so this pass
found gaps in *structure*, not in *content*. Retrofitting the content would have been ten
times the work.

**The gap that remains is the one nobody had a rule for.** "Every cue has a text
counterpart" was a rule, and it held. "Anything that appears after an action is announced"
was not, and that is exactly where the miss is. → folded into CLAUDE.md §8.
