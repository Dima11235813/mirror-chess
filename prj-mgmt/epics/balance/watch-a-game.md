# Story — Watch two engines play, and see why they chose

> **Status: DONE (2026-10-04).** `src/engine/diagnostics.ts` (the gauge),
> `src/components/SelfPlayScreen/` (the screen), `?mode=watch` and a header button.
> 5 unit tests, 9 integration, [8 e2e](./watch-a-game.e2e.ts). Part of the [balance epic](./README.md). Asked for
> by the owner: *"the part of the roadmap where we witnessed two AIs play against each
> other… can be a feature in our app"*.
>
> Sits **before** [`lab-view.md`](./lab-view.md) (many games, aggregated) and beside
> [`self-play-harness.md`](./self-play-harness.md) (many games, headless). This one is a
> single game, watched, with the engine's reasoning on screen.

## Summary

As the owner, I want to watch two engines play a game move by move and see *why* each move
was chosen, so that I can judge whether the engine is worth playing — and see the
evaluation problem rather than read about it.

## 1. What this is for, and the measurement that shaped it

Re-measured **2026-10-04**, because `readiness-probe.md`'s "18 of 18 repetition draws" was
taken on 2026-09-22, before the crossing revision, and CLAUDE.md §0 says not to inherit a
fact:

| Ruleset | Depth | Result | Plies |
| --- | --- | --- | --- |
| all-on | 2 | draw-repetition | 118 |
| all-on | 3 | draw-repetition | 81 |
| chess (all flags off) | 2 | checkmate | 56 |
| chess | 3 | draw-repetition | 99 |

**Every game opens identically — `b1c3 a7a6 a1b1 a6a5 b1a1 a5a4 a1b1 b7b6` — in both
rulesets and at both depths.** White develops a knight, then shuffles a rook `a1↔b1` while
Black walks a pawn up the board. The evaluation is material-only, so until something hangs,
*the seam makes no difference to the engine's choices at all.*

That is the finding this screen exists to make visible. It is not a demo of good play; it
is **the instrument for the evaluation work** (roadmap item 2), which is the project's
blocker and currently has no visible feedback loop. The honest framing, which the screen
itself must carry: today it shows two engines that cannot tell quiet moves apart.

> **The number to watch is "indistinguishable moves".** Of the legal moves in a position,
> how many share the best **static** evaluation? Today that is nearly all of them. A working
> evaluation drops it to a handful, and the drop is visible on this screen the moment it
> happens — which is what turns "the eval is indifferent" from a sentence into a gauge.

## 2. Acceptance Criteria

- [x] A **watch mode**, reachable from the header and by link (`?mode=watch`), that replaces
      the board as puzzle mode does. The game in progress is left untouched.
- [x] Two engines play **the same ruleset** — the one in the URL, as everywhere else. A game
      where the sides play different rules is a different game, not a comparison
      (`self-play-harness.md` §1).
- [x] **Play / pause / step / reset.** Step plays exactly one move, so a position can be
      inspected. Pause takes effect before the next move, never mid-search.
- [x] Moves are applied through **`reduceMove`**, so the clock, repetition history and draw
      rules are all maintained — `advancePosition` would hang the game (`readiness-probe.md`
      §5, and it has caught us twice).
- [x] Each move is recorded with the engine's reasoning: **score, depth reached, nodes,
      elapsed, the principal variation**, and the `*` seam marker when it crossed.
- [x] The **indistinguishable-moves** count is shown per position, with its total: "28 of 31
      moves indistinguishable". It is computed from the static evaluation, and labelled as
      such — the search can separate moves the evaluation cannot.
- [x] The game **ends properly**: checkmate, stalemate and all three draws are announced by
      name, and play stops.
- [x] Searching happens **on the Web Worker**, so the page stays responsive — the same
      client the human-vs-engine opponent already uses.
- [x] Accessible: the move list is a real list, the status is announced, every control is
      reachable and labelled, and the screen works in both themes at phone width.

## 3. Deliberately not in this story

- **Many games, aggregated** → [`lab-view.md`](./lab-view.md).
- **Headless runs for the study** → [`self-play-harness.md`](./self-play-harness.md). This
  screen is for *watching one*, and the harness must stay runnable without a browser.
- **Picking the ruleset in the UI** → [`../board-interactions/rules-picker.md`](../board-interactions/rules-picker.md).
  Until then the URL carries it, which is enough for a link in a bug report.
- **Fixing the evaluation** → [`../engine/evaluation.md`](../engine/evaluation.md). This
  story builds the gauge; it does not move the needle.

## 4. Test plan

| Tier | File | What it proves |
| --- | --- | --- |
| Unit | `src/engine/diagnostics.test.ts` | The indistinguishable count: all-equal in a quiet position, and strictly fewer when a capture is available |
| Integration | `src/components/SelfPlayScreen/SelfPlayScreen.spec.tsx` | Play/pause/step, the move log, the reasoning, and the end-of-game announcement — driven by an injected fake engine, so no worker is needed |
| E2E | `watch-a-game.e2e.ts` | The real screen with the real worker: a move actually appears on the board and in the log |

## 5. What we learned

**The gauge works, and it already moves.** The screen shows `20 of 20` at the start and
`23 of 23` after a few plies — but at ply 7 of the real game it read **`1 of 21`**, because
a pawn had become capturable. So the evaluation is not uniformly blind; it is blind
*exactly* when no material is at stake, which is most of a game. That is a sharper
statement of the blocker than "the engine shuffles", and it came from watching the number
rather than from reasoning about it.

**Two bugs, both found by looking at a screenshot rather than by a test.**

1. **Reset and Save Game were visible in watch mode**, acting on a game the player could
   not see — the exact trap the comment beside them warns about. The condition was
   `!puzzleMode`: a boolean meaning *"the other screen"*, which silently stopped meaning
   "the game screen" the moment a third screen existed. Now `screen === 'game'`.
   → **When a two-way toggle becomes a three-way choice, every `!flag` in the file is a
   suspect.** Nine integration tests and the whole e2e suite passed with this bug on screen.
2. The watch controls borrowed the header's `.actions` class for its layout, which made
   "the header's Reset button" unselectable in a test — both rows matched. Its own class
   now, with the layout copied rather than inherited.

**The file labels fooled a test for the second time.** `expect(square).toBe('')` reads `b1`
as `"B"` whether or not a piece is there, because the coordinate labels are drawn inside
edge squares. Both the integration spec and the e2e now assert on the **glyph range**
(`\u2654-\u265F`) instead. Worth generalising: an assertion about *emptiness* on a square is
really an assertion about *a piece*, and those differ wherever decoration lives in the same
element.

**Injecting `think` as a prop was the right call** and cost nothing: jsdom has no `Worker`,
so the alternative was module mocking. The fake engine plays **real legal moves** from the
generator rather than invented ones, which matters — the screen applies what it is given
through `reduceMove`, so a made-up move would be rejected by the rules and the test would
be exercising a path no engine can reach.

## 6. Notes

- The screen takes its `think` function as a **prop**, defaulting to the real worker client.
  That is what lets the integration tests drive it deterministically in jsdom, which has no
  `Worker` — and it keeps the component free of engine lifecycle code.
- Keep the engine's own text honest. If the score is `0.00` and the PV is a rook shuffle,
  the screen should show that plainly rather than dressing it up; this screen's value today
  is that it does not hide the problem.
