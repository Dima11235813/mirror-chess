# Prevent Wrong Move Feature

> **Mostly DONE.** The engine half is delivered by
> [`legality-layer.md`](../../rules/legality-layer.md), implementing
> [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §10.3.

## Check

As a user in check, I want to be prevented from making moves that do not resolve the
check so that I can only make legal moves.

### Acceptance Criteria

- [x] When a player is in check, they can only make moves that resolve the check.
      `legalMovesFor` filters every move by whether the mover's king is still
      attacked afterwards, so non-resolving moves are never offered — including
      checks delivered through the mirror seam.
- [x] The game state remains unchanged if an illegal move is attempted while in
      check. `reduceMove` returns the same state object.
- [x] The player can see all legal moves available to them — selecting a piece shows
      exactly its legal destinations, which while in check are only the resolving
      ones.
- [x] An appropriate message is displayed when an illegal move is attempted.
      Picking a square the selected piece *could* reach but for king safety shows
      "Not allowed: that move would leave your king in check." in a live region;
      the piece stays selected so the player can choose again. Delivered by
      [`check-highlighting.md`](../../game-logic/king/check-highlighting.md).

## Note on "assistance mode"

The original wording gated seeing legal moves behind an assistance mode. The board
currently always shows legal destinations for the selected piece; if a
no-assistance/"hard" mode is wanted later, that is a new decision, not a bug.

## Verified by

- Unit: `src/game/legality.test.ts`
- E2E: `prj-mgmt/epics/rules/legality.e2e.ts`
