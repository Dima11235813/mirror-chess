# Submit Mode

> **Status: DONE (2026-10-09).** `src/shared/settings.ts` (parsed, persisted),
> `src/components/SettingsDialog.tsx` (the gear), and `BoardView`'s submit bar. Proved by
> `src/shared/settings.test.ts`, `src/components/SettingsDialog.spec.tsx`,
> `src/components/BoardView.submit.spec.tsx` and
> [`../move-piece/inspect-and-confirm.e2e.ts`](../move-piece/inspect-and-confirm.e2e.ts).

As a user, I want to be able to toggle between "Auto Submit Move" and "Manual Submit Move"
so that I can control when moves are submitted.

## Acceptance Criteria

- [x] Settings include **Play moves immediately** (auto-submit), on by default.
- [x] The user can toggle between automatic and manual submission.
- [x] The user can reset the settings to the default.
- [x] The settings are an accessible dialog, opened by a **gear in the app header**.

## 1. Where the gear lives — decided 2026-10-09

Two stories disagreed: this one said the header, and
[`../move-piece/submit-move.md`](../move-piece/submit-move.md) said *"a Settings Gear icon
button should be located below the chess board"*. The owner chose the **header**, and the
reasons are worth keeping:

- Every other app-wide control — Puzzles, Watch, theme — is already there, so one row of
  controls stays one row.
- It remains reachable from the puzzle and watch screens. A control below the board would
  vanish on exactly the screens that also commit moves.

The below-the-board wording is struck through in that story rather than deleted.

## 2. Notes

- The dialog applies changes **immediately** and offers only *Close*, no *OK*. A panel that
  needs saving is a panel that can be half-saved, and
  [`../../board-interactions/customization/persist-settings.md`](../../board-interactions/customization/persist-settings.md)
  asks for a change to survive from the moment it is made.
- `localStorage` is a **trust boundary**: settings are *parsed* field by field, never cast,
  so a hand-edited or future-version blob costs the user their preferences and never a
  crash on load (CLAUDE.md §8, `docs/design-patterns/parse-dont-validate.md`).
