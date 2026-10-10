# Story — Step back through a game, then return to the present

> **Status: BACKLOG — asked for by the owner, 2026-10-10.** Part of the
> [prj-mgmt map](../../../README.md). Shares its foundation with
> [`undo-move.md`](./undo-move.md) and [`move-log.md`](./move-log.md), and should probably
> be built with them — see §3.

## Summary

As a player, I want to step backwards through the moves of a game to look at earlier
positions, and then jump back to the present — whether I am playing a person, playing the
engine, or watching two engines play.

> The owner's words, 2026-10-10: *"the ability to step back through the history of the
> gameplay to analyze different positions and then be able to fast forward back to the
> current state whether you're playing against someone, against the computer, or watching
> a game."*

## 1. The distinction this story turns on

**Reviewing is not undoing.** They look similar and are opposites:

| | Undo (`undo-move.md`) | Review (this story) |
| --- | --- | --- |
| Changes the game | **yes** — the move never happened | **no** — the game is untouched |
| Legal while the engine is thinking | no | **yes**, it reads nothing the engine owns |
| Legal in a finished game | no | **yes**, and that is when it is most wanted |
| Leaves you where? | at the earlier position, now current | back in the present, by design |

Keeping them separate is what makes review safe to offer everywhere, including mid-game
against an opponent, where undo would be a cheat.

## 2. Acceptance Criteria

- [ ] From any screen that shows a game — play, versus engine, watch — I can step
      **back** one move, **forward** one move, and jump to **start** or **present**.
- [ ] While reviewing, the board shows the historical position and says so plainly: a
      player must never mistake a reviewed position for the live one.
- [ ] **No move can be played while reviewing.** Returning to the present is a deliberate
      act, not a side effect of touching the board.
- [ ] The live game is **unaffected** — the engine keeps thinking, the clock and
      repetition history are untouched, and returning to the present finds it as it was.
- [ ] Works in **watch mode** while two engines play: stepping back pauses nothing, and
      the game continues to advance in the background.
- [ ] Reachable by **keyboard** (arrow keys are the obvious binding) and announced, so a
      screen-reader user hears which position they are on: *"reviewing move 12 of 31"*.
- [ ] A reviewed position can be **inspected** with the enemy-piece preview built on
      2026-10-09 (`../../user-moves/move-piece/select-piece.md`) — that is most of what
      "analyse a position" means here.

## 3. What it needs first, and the cheap way in

Everything here needs **the sequence of moves**, which nothing records yet. That is the
same blocker as `undo-move.md`, and it is worth re-reading that story's warning: the draw
rules built a *position* history for repetition, and it turned out not to be the history
undo wanted. Two different things get called "history".

**The cheap way in, which this project's immutability makes almost free:** `reduceMove`
returns a new `GameState` and never mutates, so a list of the states already produced *is*
the history. Keeping `GameState[]` costs one push per move and makes review a matter of
indexing into it — no replay, no reconstruction, no risk of a divergent rebuild.

That is a different (and simpler) choice than storing `Move[]` and replaying, which is
what notation and export want. Both may be needed; decide deliberately rather than
discovering it later:

| Approach | Review | Undo | Move log / export | Cost |
| --- | --- | --- | --- | --- |
| `GameState[]` | trivial — index | trivial — truncate | no | memory per ply, small |
| `Move[]` + replay | replay from start | truncate + replay | **yes** | compute per step |
| Both | trivial | trivial | yes | a little of each, and one more thing to keep in step |

> Whatever is chosen, it belongs in **one** place that all three stories consume. Three
> components each keeping their own history is how they drift.

## 4. Notes

- The watch screen already keeps a per-move log with the engine's reasoning
  (`WatchedMove[]` in `SelfPlayScreen.types.ts`). It is the closest thing to a move history
  in the codebase and a good model for the record's shape — but it is **presentation**,
  not game state, and should not quietly become the source of truth.
- Reviewing is the natural home for the per-move diagnostics the watch screen shows: once
  you can stand on move 12, "what did the engine see here?" is the next question.
