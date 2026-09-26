# [SUPERSEDED] Mirror En Passant not offered for Pawn @ a5

> **Not a valid defect against v1.** The behavior this report asks for — a white pawn
> on `a5` capturing onto `h7` after `h7→h5` — depends on the pawn projection rule that
> [the Mirror Portal spec](../../rules/mirror-portal-spec.md) removed (§2 limits the
> portal to sliders; §8.2 defers pawn portal behavior; §8.4 defers en passant and
> calls for a *real* implementation rather than the old projection).

## Why it is filed as superseded rather than fixed

The report was written against an unspecified rule. Implementing it would reinstate
exactly the kind of invented mirror behavior the reboot exists to prevent. The
engine correctly offers only `a6` for a pawn on `a5` today.

## What is genuinely missing (and tracked elsewhere)

- **En-passant state in `GameState`** — the engine cannot see the previous move, so
  even *orthodox* en passant is unimplementable. Tracked by
  [`regular-en-passant.md`](./regular-en-passant.md).
- **A confirmed pawn portal rule** — see [`mirror-move.md`](./mirror-move.md).
- **Mirror en passant**, once both of the above exist —
  [`mirror-en-passant.md`](./mirror-en-passant.md).

Re-open a fresh bug only after the spec grants pawns a portal.
