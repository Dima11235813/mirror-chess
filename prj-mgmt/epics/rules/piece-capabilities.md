# Story — Every piece, every capability, asserted in the UI

> **Status: DONE (2026-09-23).** Forty e2e tests in
> [`piece-capabilities.e2e.ts`](./piece-capabilities.e2e.ts), covering six pieces × four
> capabilities, each with a flag-off control, plus check through the seam for every piece
> that can give it.

## Summary

As the owner, I want each piece's four basic abilities asserted against the real board —
move, move across the seam, capture, capture across the seam — so that the functionality
core to the engine is verified end to end rather than inferred from unit tests.

## 1. Why the existing suite was not enough

The e2e suite grew story by story, so it covered what each story happened to need. An
audit on 2026-09-23 found the coverage uneven in a way nobody would have guessed:

| Piece | Ordinary move | Seam move | Ordinary capture | Seam capture |
| --- | --- | --- | --- | --- |
| Bishop | ✅ | ✅ | ✅ | ✅ |
| Rook | — | ✅ (§5.3) | — | — |
| Queen | — | ✅ (one test) | — | — |
| Knight | — | ✅ | — | — |
| King | — | ✅ | — | — |
| Pawn | ✅ | n/a — pushes never wrap | ✅ | ✅ (en passant too) |

The bishop was covered because it was the piece the spec's headline example used. **The
rook and queen — the pieces whose portal reaches furthest — had almost nothing**, and
outside the pawn's en passant, no test ever *executed* a capture across the seam. A rule
can be right in `legalMovesFor` and still be unreachable, mislabelled or unplayable on the
board; that gap is exactly what e2e exists to close.

## 2. What the matrix asserts

For each of the six pieces:

| | ordinary | across the seam |
| --- | --- | --- |
| **move** | reaches an empty square | reaches an empty square on the far side |
| **capture** | takes an enemy | takes an enemy on the far side, **and the move is played** |

plus two **controls** per piece: with the piece's flag off, the far-side destination is
gone *and* the ordinary one remains; and the far-side enemy cannot be taken.

Then attack as distinct from capture: **every piece that can give check gives it through
the seam** — bishop, rook, queen, knight and pawn — asserted on the status line and on the
checking piece's accessible name.

**Assertions read the square's accessible name**, which carries the exact kind: `legal
move`, `legal capture`, `legal mirror move through the seam`, `legal mirror capture through
the seam`. Each test therefore checks the rule and the a11y contract together, and a
marker that rendered correctly but announced the wrong thing would fail.

## 3. Three things that shaped the fixtures

- **A spare pawn each.** Two lone kings are insufficient material, so the game is already
  drawn, the board renders no hints, and every absence assertion passes vacuously — this
  bit us hours earlier in [`adjacent-kings.md`](./adjacent-kings.md) §7.
- **Sliders need a blocker.** On an empty rank a rook's portal adds nothing: every square
  it reaches the long way round it already reaches directly, and dedupe keeps the standard
  move (spec §5.3). The own pawn on `c4` is what makes the far side reachable *only*
  through the seam.
- **Two fixtures were illegal positions and had to be fixed.** A black bishop placed as a
  knight's victim checked White's king `e1` **through the seam** from `b5` — the geometry
  the test existed to exercise, arriving from an unexpected direction. Another let the
  queen capture the black king, meaning the position could not have arisen. Both were
  caught by verifying every fixture against the engine before writing the assertions.

## 4. Acceptance Criteria

- [x] Each of the six pieces has an ordinary move, a seam move, an ordinary capture and a
      seam capture asserted — or, for the pawn's push, the **absence** of wrapping, which
      is the rule (§12.4).
- [x] Every seam capture is **executed**, not merely offered: the piece is on the far
      square, gone from the near one, and the turn has passed.
- [x] Every seam capability has a flag-off control in which it disappears while the
      ordinary capability remains.
- [x] Every piece that can give check is shown giving it through the seam.
- [x] Assertions read accessible names, so the a11y contract is covered by the same tests.
- [x] The suite is proved to be able to fail: a deliberate mutation (claiming an ordinary
      destination is a seam move) failed exactly the two tests that read it.

## 5. What we learned

**A passing suite is not evidence until it has failed once.** All forty passed on the
first run, which after the vacuous passes in [`adjacent-kings.md`](./adjacent-kings.md) was
not reassuring by itself. Mutating one fixture — pointing the bishop's "seam move"
assertion at `d2`, an ordinary destination — failed the two tests that read it and printed
`aria-label="d2, empty, legal move"`. That is the cheapest possible liveness check and it
belongs in the habit: **break it on purpose once, then put it back.**

**The audit table was worth more than the tests.** Writing down which piece had which
coverage took minutes and showed that the two most powerful sliders were the least tested
— which no amount of "the suite is green" would have revealed.

## 6. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| E2E | [`piece-capabilities.e2e.ts`](./piece-capabilities.e2e.ts) | the matrix: 6 pieces × 4 capabilities, controls, and check through the seam |
| Unit | `src/game/*.test.ts` | the same rules at the generator level — these are the reachability proof on top |

## Definition of done

Every piece's four basic capabilities are asserted against the real board, each with a
control that removes the seam, and the suite has been shown to fail when the rule is
misstated.
