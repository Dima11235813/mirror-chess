# King Check — Game Logic Feature

> **Engine parts: DONE.** Specified in
> [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §10 and delivered by
> [`legality-layer.md`](../../rules/legality-layer.md).
> **UI parts: carved out** into [`check-highlighting.md`](./check-highlighting.md) —
> they were never engine work and were blocking this file from being closable.

## Delivered

- [x] **Prevent moving into check.** A move that would leave the mover's own king
      attacked is never generated, so it cannot be selected or played (§10.3).
- [x] **Block illegal moves that cause check.** `reduceMove` returns the state
      unchanged for an illegal move, and also refuses to move a piece belonging to
      the side not on turn.
- [x] **Detect mirror check threats.** Attack generation includes portal rays, so a
      bishop on `b3` checks a king on `g1` through the seam (§10.1). Verified by
      `src/game/attacks.test.ts` and `legality.e2e.ts`.
- [x] **Validate all opponent moves.** The same filter applies to both colors; no
      side can end its turn with its own king attacked.
- [x] **Display check state immediately.** The footer is a live region announcing
      `Turn: white — check`, checkmate (with the winner) or stalemate.
- [x] **Resolve an existing check.** While in check, only moves that end it are
      offered — capture the checker, block on either side of the seam, or move the
      king. This needs no separate rule; it falls out of §10.3.

## Verified by

- Unit: `src/game/attacks.test.ts`, `src/game/legality.test.ts`,
  `src/game/status.test.ts`
- E2E: `prj-mgmt/epics/rules/legality.e2e.ts`
