# Story — Playing against the engine

> Part of the [opponent epic](./README.md). Hosting, difficulty and UI.

## Summary

As a player, I want to start a game against the computer, pick a side and a difficulty,
and see it think and move, without the page freezing.

## 1. Hosting: a Web Worker

The search must not run on the main thread — a one-second search would freeze the
board, the theme toggle and every button. A **Web Worker** is the right first answer:
it keeps the app offline-capable, needs no server, and Vite supports workers natively.

```ts
// main → worker
type EngineRequest =
  | { readonly type: 'search'; readonly id: number; readonly state: GameState; readonly limits: SearchLimits }
  | { readonly type: 'cancel'; readonly id: number }

// worker → main
type EngineResponse =
  | { readonly type: 'progress'; readonly id: number; readonly depth: number; readonly score: number }
  | { readonly type: 'result'; readonly id: number; readonly result: SearchResult }
```

- `GameState` is already plain data, so it structured-clones without work. Payloads are
  bytes at this size — **structured-clone cost is irrelevant here, do not design around
  it** ([research](../engine/research/exemplars-and-ts-perf.md)).
- Requests carry an `id` so a stale reply — after the player takes back a move or
  starts a new game — is discarded rather than played.
- The worker is the *only* consumer that needs a clock; the search core stays pure
  ([`engine-core.md`](../engine/engine-core.md)).

> ### Correction (2026-08-02): `cancel` over `postMessage` does not work
>
> A worker spinning inside negamax **cannot process incoming messages** — the event loop
> is blocked, so a `cancel` sits in the queue until the search finishes, which is exactly
> when it is no longer needed. This is not a subtlety; it is why the Lozza engine
> documents that it does not support a `stop` command at all.
>
> Two workable designs, in order of preference:
>
> 1. **A `SharedArrayBuffer` stop flag** — one byte, polled every ~2048 nodes alongside
>    the time check. Clean and immediate, but `SharedArrayBuffer` requires COOP/COEP
>    cross-origin isolation, which is a **real deployment constraint** to decide on
>    before committing. Never `Atomics.wait` on the main thread.
> 2. **Terminate and respawn the worker.** Crude but dependency-free and always
>    available; costs worker startup and discards the transposition table.
>
> **[decision]** Which to ship. The `id`-based stale-reply guard is still needed either
> way — it protects against a *completed* search arriving late, which is a different
> problem from stopping one in flight.

The eventual Rust/WASM engine (CLAUDE.md §6) can slot in behind this same message
contract, which is a good reason to define the contract carefully now.

## 2. Difficulty that degrades gracefully

The obvious approach — lower the search depth — produces an opponent that is
*erratic* rather than *weak*: it still sees every three-move tactic, then hangs a queen
to a four-move one. That feels arbitrary and teaches the player nothing.

Better, roughly in order of effort:

1. **Limit depth, and add a small evaluation noise term** seeded per game. The engine
   plays consistently but slightly misjudges positions, like a weaker player.
2. **Pick from the top-N moves** weighted by score, with the spread widening at lower
   difficulty. Keeps play sensible while making it beatable and less repetitive.
3. **Cap search on quiet positions only**, so it still resolves tactics it has entered.

**[decision]** Which scheme to ship. Recommendation: (1) plus (2), because together
they give variety *and* graceful degradation, and both are a few lines on top of the
search. Levels should be named for the player ("Casual", "Club", "Strong"), not
labelled with a depth number.

A difficulty level must never produce an **illegal or non-move**; whatever the
randomisation, the result goes through `reduceMove` like any other move.

## 3. Acceptance Criteria

> **Status: mostly DONE (2026-08-05).** Built as `src/engine/host/` (worker, client,
> levels) plus `useEngineOpponent` and `OpponentControls`; covered by
> `prj-mgmt/epics/opponent/opponent.e2e.ts`.

- [x] A game can be started against the engine, choosing to play White or Black. Also
      reachable as `?engine=white|black&level=…`, so a situation can be reproduced in a
      bug report the same way `?board=` allows.
- [x] The engine moves automatically when it is its turn, and only then.
- [x] The UI never blocks — asserted directly: while the engine is thinking, a control is
      clicked and the interaction must complete in under two seconds. On the main thread
      that assertion fails, which is the point of writing it that way.
- [x] A visible, accessible "thinking" indicator: a `role="status"` `aria-live` region
      reporting the depth reached, so a screen-reader user learns the engine is working
      *and* how far it has got. Not a spinner.
- [x] Resetting, loading a saved game or switching sides stops the search and never plays
      a stale result. **Two guards**, deliberately: the client drops any reply whose
      request id is not current, and the hook re-checks that the position it asked about
      is still on screen — React state can move on even when the id matches.
- [x] Three difficulty levels, differing **only in how long they think**. Not verified by
      a match yet: that needs the self-play harness (`balance/self-play-harness.md`), and
      is the one criterion here still genuinely open.
- [x] The engine respects the game's ruleset — it is read from the `GameState` that is
      passed to the worker, so a rule flag cannot be forgotten.
- [x] Terminal states are handled: the hook does not ask for a move once `isGameOver`.
- [x] Engine moves flow through `reduceMove`, so an engine bug cannot corrupt state.
- [x] Hot-seat two-player mode still works and is still the default.
- [ ] Works in both themes and on a phone-sized viewport. *(Styled for it — the controls
      wrap without a media query — but not yet asserted at a phone viewport.)*

## 3a. What building it actually turned on

**A `worker` block in `vite.config.ts`.** Vite builds workers with a *separate* plugin
pipeline, so the path aliases the app uses were not applied and the build failed with an
unresolved `@game/advance` — reported against the *client* file, which is a confusing place
to start looking. Worth knowing before the next worker is added.

**No serialisation layer.** `GameState` crosses to the worker by structured clone with no
conversion step, because the game core is plain objects, arrays, strings and numbers — no
classes, no functions, no cycles. Purity bought that for free
(`docs/design-patterns/functional-core-imperative-shell.md`).

**Locking the board.** Not in the original list, and necessary: while the engine thinks,
the player could otherwise move *for* it, and the reply would then be computed for a
position that never existed. `BoardView` takes a `locked` prop for it.

## 4. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/engine/difficulty.test.ts` | level selection is deterministic per seed; never returns an illegal move |
| Integration | `src/components/EnginePanel.spec.tsx` | side/difficulty controls, thinking indicator, cancellation |
| E2E | `prj-mgmt/epics/opponent/play-vs-engine.e2e.ts` | play a short game against the weakest level; UI stays responsive; mate ends it |
| Match | `scripts/level-ladder.ts` | each level beats the one below, with confidence intervals |

The e2e should assert **responsiveness during the search** — e.g. toggling the theme
while the engine thinks — because that is the whole point of the worker and the easiest
thing to regress.

## 5. Out of scope

Ratings, matchmaking, opening books, and anything networked. An opening book is worth
noting as a later idea: none exists for this variant, so early play will be
unprincipled — which for a casual opponent is acceptable, and arguably interesting.

## Definition of done

The owner can start a game against the engine at a chosen strength and side, play it to
a finish without the UI stalling, and lose to the strong level while beating the weak
one.
