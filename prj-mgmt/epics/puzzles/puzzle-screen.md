# Story — A screen to solve puzzles on

> **Status: DONE (2026-09-25).** Part of the [puzzles epic](./README.md).
> `src/components/PuzzleScreen/`, wired into the shell behind `?mode=puzzles` and a header
> toggle. E2E: [`puzzle-screen.e2e.ts`](./puzzle-screen.e2e.ts).

## Summary

As the owner, I want to sit down and solve the mined puzzles, so that the set can be
judged as a *game* rather than as JSON — which is the only way to find out whether any of
this is fun.

## 1. How solving works, and why

**The player plays the key move only.** That is not a simplification: it is exactly what
the miner proved — a *unique* first move forces mate — so the screen needs no engine at
runtime and a session stays fast. Playing the whole line out would need a defence chosen
at runtime and would make 161 puzzles a long evening.

**A wrong move is refused, not played out.** In a mate in two there is nothing instructive
down a line that does not force mate, so the board stays as the puzzle set it and the
player tries again.

**The seam is revealed only after solving.** Highlighting the route up front would give the
answer away in the 48 puzzles whose solution crosses the seam — with this little material,
"which piece can reach across" is most of the work. On success the screen shows the whole
journey (`f8 → g7 → h6 → a6 → b5 → c4`) and states the claim the set is built on:
**with every portal closed, this position has no forced mate at all.**

`BoardView` is reused unchanged, so the cues a player relies on in a game — hollow rings
for portal destinations, check paths, accessible names — are the same ones here.

## 2. Acceptance Criteria

- [x] Opens from the header and from `?mode=puzzles`; `?puzzle=N` opens one puzzle, so a
      position can be linked in a bug report.
- [x] States the goal, the puzzle number, the material and **the ruleset** — the same board
      under another token is a different puzzle.
- [x] Accepts the recorded solution; refuses anything else with a reason and allows a retry.
- [x] **Plays the solution on the board**, so the journey is watched and not only described.
- [x] Reveals the route and the chess-differential only after solving.
- [x] Moving on resets the verdict and the board, and wraps at the end of the set.
- [x] Reset and Save are hidden in puzzle mode: they act on the game, which is not on screen.
- [x] Verdicts are announced in a live region, so a screen reader hears the result.
- [x] Integration tests drive the component with **real mined puzzles**; e2e drives the
      shipped app against the **committed set**.

## 3. What we learned

**The tests all passed while the screen was visibly wrong.** The first version never played
the solution: the reveal described a bishop travelling `f8 → h6 → a6 → c4` while the bishop
sat on `f8` and the knight it had supposedly captured sat on `c4`. Nine integration tests
and eight e2e tests passed, because every one of them asserted on *text* — the verdict, the
reveal, the prompt — and none asserted the board had changed.

A screenshot caught it in seconds. The lesson is not "write more tests" but **look at the
thing**: assertions encode what you thought to check, and a screen has a whole dimension
(does it look right?) that text assertions do not reach. Two tests now cover it.

**The e2e cost three red runs by assuming puzzle order.** The seam puzzle used in the tests
is the *second* in the committed set, not the first — it was simply the first one I had
printed while exploring. The tests now open it by index and say why.

## 4. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Integration | `src/components/PuzzleScreen/PuzzleScreen.spec.tsx` | prompt, verdict, reveal, board updates, retry, next, index clamping |
| E2E | [`puzzle-screen.e2e.ts`](./puzzle-screen.e2e.ts) | the real set through the real app: mode toggle, links, solving, refusal, portal cues |

## 5. What is deliberately not here

- **No difficulty rating or progress.** There is no solve data yet, and a made-up rating is
  worse than none. Hints would give the first real signal → [`README.md`](./README.md) §6.
- **No "show it in chess" button.** The reveal states the differential; showing it would
  mean rendering a second board, and the claim is already proved in the test suite.
- **No shuffling or filtering.** The set is small and ordered; picking by material or by
  "seam solutions only" is worth having once there are thousands.

## Definition of done

A screen where the mined set can be played, where solving shows the move happen and
explains why it could not have happened in chess.
