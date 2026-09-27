# [DEFERRED] Pawn – Mirror En Passant

> **Not in v1 — do not implement from this file.**
> [Mirror Portal spec](../../rules/mirror-portal-spec.md) §8.4 defers en passant, and
> explicitly calls for a *real* en passant rather than the old projection. §8.2 also
> defers pawn portal behavior, which this story presupposes.

The acceptance criteria previously in this file (a pawn on `a5` capturing onto `h7`
after `h7→h5`) were built on the superseded pawn-projection rule — see
[`mirror-attack.md`](./mirror-attack.md). They are not a valid target.

## Prerequisites before this can be written properly

1. **En-passant state in `GameState`.** There is none today; the engine cannot know
   the previous move. This blocks orthodox en passant too.
2. **A confirmed pawn portal rule** (spec §8.2) — a mirror en passant cannot be
   specified before ordinary mirror pawn movement is.
3. **The legality layer** (spec §8.3), since en passant interacts with pins.

Orthodox en passant is the separate, unblocked-by-rules story:
[`regular-en-passant.md`](./regular-en-passant.md). Its unit test
(`src/game/pawn.enpassant.regular.test.ts`) and e2e are skipped pending (1).

## Related

- Old bug writeup: [`bug.md`](./bug.md) — also superseded.
