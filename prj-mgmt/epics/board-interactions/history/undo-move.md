# Undo Move

> **Status: UNBLOCKED (2026-09-22) — waiting on [`move-log.md`](./move-log.md), not on a
> decision.** Notation was adopted (spec §8.5, the `*` seam tag), which was the thing
> blocking the move list this story needs. Pick it up once the move log records games.

> **Status: BLOCKED — needs a move list, which does not exist yet.**
>
> The draw rules added *position* history to `GameState` (`history`, a list of repetition
> keys since the last irreversible move) and that is **not** what this story needs. Undo
> needs the **sequence of moves**, and nothing records it.
>
> Read that as a warning about the phrase "design it once": the draw-rules story set out to
> build one history for repetition, undo and notation together. It turned out repetition
> wants position keys and undo wants moves — two different things that both get called
> "history". Sharing them would have been a mistake discovered later and more expensively.
>
> **Also needs [notation](../../rules/mirror-portal-spec.md) (§8.5, still `[decision]`)** if
> the undo is ever to show *what* is being undone. SAN cannot express a portal move, and
> there is now more to say than before: a castle, a promotion piece, an en-passant capture
> and a seam crossing.
>
> One thing that will make this easier than it looks: engine moves already flow through
> `reduceMove`, and the game core is immutable — so a stack of previous `GameState` objects
> is a correct, if unsubtle, implementation, and a correct one is worth having first.

As a user, I want to be able to undo my last move so that I can correct mistakes or change my strategy. 

## Acceptance Criteria
- The user can click an "Undo" and "Redo" button to revert the last move made.
- The buttons should use intuitive icons (e.g., a backward arrow for undo and a forward arrow for redo).
- Hovering or long pressing the buttons should display a tooltip with "Step Back" for undo and "Step Forward" for redo.
- The game state updates to reflect the board position before the last move.
- The user can keep undoing moves to review the game all the way back to the start.