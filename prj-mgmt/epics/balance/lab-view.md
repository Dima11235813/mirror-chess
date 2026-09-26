# Story — The lab: many games at once, from above

> **Status: BACKLOG — second validation surface (owner, 2026-09-22).** Part of the
> [balance epic](./README.md). Depends on
> [`self-play-harness.md`](./self-play-harness.md) for the games and
> [`../board-interactions/history/move-log.md`](../board-interactions/history/move-log.md)
> for the record format. The owner chose the play-against-it surface first
> ([`../board-interactions/rules-picker.md`](../board-interactions/rules-picker.md)).

## Summary

As the owner, I want to launch many games across rulesets and see the result from above, so
that I can watch the variant study happen rather than wait for a report.

## 1. What it shows

One row per ruleset, live as games land:

| Column | Why |
| --- | --- |
| Ruleset (token + the six toggles) | Which game this is |
| Games done / planned, with progress | Runs take hours; silence is not progress |
| **W / D / L**, never a single score | A 55% score means different things at 10% and 80% draws |
| White score ± interval | The balance question, with its uncertainty attached |
| Draw rate ± interval, and **how** games ended | "Drawn by repetition after real play" ≠ "hit the move limit" |
| Mean / median plies | Very short suggests a forced tactic; very long, no progress |
| Portal-move share, per piece | A flag that changes nothing is not a variant |

Two things it must make easy, because they are how a number becomes a finding:

- **Open any game on the board** and replay it. A row is a claim; a game is the evidence.
- **Compare against the control.** Every variant shown as a difference from all-off on the
  same openings, which is what makes the control do statistical work rather than
  sanity-checking.

## 2. What it is not

**Not the study's analysis.** The statistics, the factorial contrasts, the multiplicity
correction and the tuning live in [`analysis-project.md`](./analysis-project.md); this is
the operational view — is the run healthy, is anything obviously degenerate, is it worth
letting finish. The two read the **same** JSONL, so they cannot disagree about what
happened.

Keeping that boundary is what stops this growing into a second, worse analysis pipeline in
TypeScript.

**Not where games are played.** Self-play runs headless in worker processes; the lab view
launches and observes. A browser tab is not a compute budget.

## 3. Acceptance Criteria

- [ ] Launch a run: pick rulesets (or all 64), games per cell, budget, seed; watch progress.
- [ ] A run survives a page reload — the view reads results from disk, it does not own them.
- [ ] Every rate carries an interval; no bare means anywhere in the UI.
- [ ] Termination reasons are broken out, with move-limit games visibly separate from real
      draws.
- [ ] Any game opens on the board and replays.
- [ ] Every variant can be read as a paired difference from the all-off control.
- [ ] The view refuses to show a study summary until the **control** has passed its
      calibration ([README §4](./README.md)) — if the control is wrong, the numbers are
      wrong, and a dashboard is very good at making wrong numbers look official.
- [ ] Works in both themes; tables are screen-reader navigable.

## 4. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Integration | `src/components/LabView.spec.tsx` | rows render from fixture JSONL; intervals shown; control gate blocks the summary |
| E2E | `prj-mgmt/epics/balance/lab-view.e2e.ts` | launch a small run, watch it finish, open a game |

## Definition of done

A run can be started, watched, trusted or abandoned early — and any row in it can be turned
back into a game on a board.
