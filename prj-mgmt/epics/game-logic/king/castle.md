# King Castle Feature

> **Status: DONE (2026-08-05), delivered by
> [`../../rules/special-moves.md`](../../rules/special-moves.md).** Specified in
> [spec §13.3](../../rules/mirror-portal-spec.md), implemented in `src/game/moves.ts`,
> covered by `src/game/special-moves.test.ts` and
> `prj-mgmt/epics/rules/special-moves.e2e.ts`.
>
> Two corrections to the criteria below, both worth keeping:
>
> - "Valid moves should be highlighted in **green**" — the board never used colour alone.
>   A castle is marked by a distinct *shape* (a wide bar) and an `aria-label`, because a
>   colour-only cue is unusable for some players (CLAUDE.md §7).
> - The list omits **"the king may not castle *through* an attacked square"**, which is a
>   real rule and the one the general self-check filter cannot enforce — that filter only
>   inspects the final position. It is tested explicitly.
>
> And one thing nobody could have written here in advance: because attacks travel through
> the seam, **an enemy bishop can forbid castling from the opposite corner of the board.**

## User Story

As a user, I want to be able to castle my king to the right or left so that I can move my king and rook to safety.

### Acceptance Criteria
* When a user clicks on the king, they should be able to see a list of possible moves.
* When a user clicks on a move, the king should move to the new position and the rook should move to the new position.
* Valid moves should be highlighted in green.
* The king can't castle if there is a piece in the way.
* The king can't castle if the rook has moved.
* The king can't castle if the king has moved.
* The king can't castle if the king is in check.