# Knight – Mirror Attack (capture across the seam)

> Specified in [the Mirror Portal spec](../../rules/mirror-portal-spec.md) §11 and
> delivered by [`stepper-portal.md`](../../rules/stepper-portal.md).
>
> **The earlier version of this story is rejected.** It had the knight *move* to the
> same-rank file mirror (`a3 → h3`) but *capture* onto an adjacent rank (`a3 → h4`) —
> two different rules for one piece, never derived from a spec. Under §11 a knight
> moves and captures on exactly the same squares, as it does in ordinary chess.

## Summary

As a player, I want a knight's wrapped jump to capture whatever it lands on, so that
moving and capturing follow one rule.

## Acceptance Criteria

- [x] A wrapped destination holding an enemy piece is a capture, flagged
      `special: 'mirror'` — the same squares the knight could move to when empty.
- [x] A wrapped destination holding an own piece is not offered.
- [x] A wrapped knight attack gives check: a knight on `a3` checks a king on `h5`.
- [x] It does **not** give check on `h3` — the rejected same-rank square.
- [x] A wrapped capture is filtered by king safety like any other move (§10.3).

## Test Cases

- [x] `w:Na3; b:Ph5` → `h5` is offered as a mirror capture.
- [x] `w:Na3,Ph5` → `h5` is not offered.
- [x] `w:Na3; b:Kh5` → black is in check.
- [x] `w:Na3; b:Kh3` → black is **not** in check.

## Verified by

- Unit: `src/game/knight.test.ts`, `src/game/attacks.test.ts`
- E2E: `prj-mgmt/epics/rules/mirror-portal.e2e.ts`
