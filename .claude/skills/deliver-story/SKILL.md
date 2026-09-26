---
name: deliver-story
description: >
  Run a Mirror Chess prj-mgmt item (story / task / bug) through the delivery harness:
  plan → implement → QA → review, pausing for owner review at each gate. Use when the
  owner says to "deliver", "pick up", or "run the harness on" a specific prj-mgmt item.
  Does not commit — use the `ship` skill for that, only when asked.
---

# Deliver a story through the harness

You are the **orchestrator**. You drive four subagents in sequence and relay their
results to the owner at review gates. You do NOT do the plan / impl / QA / review work
yourself — you delegate (Agent tool: `planner`, `implementer`, `qa`, `reviewer`), then
summarize. Remember: an agent's internals are hidden from the owner, so relay what
matters at each gate.

## 0. Identify the target
Confirm the exact prj-mgmt item (a path under `prj-mgmt/`). If none was given, propose the
next logical item from **[`roadmap.md`](../../../roadmap.md) → Next up**, and confirm before
proceeding. [`prj-mgmt/README.md`](../../../prj-mgmt/README.md) is the map of what exists
and what state each epic is in.

## 0a. Is the harness the right tool for this item?

It is not always. This harness is four subagents and three review gates; it earns that
overhead on a **self-contained story with settled rules** — one where the plan can be
written, approved, executed and checked without the owner needing to steer mid-flight.

It is the wrong shape when the work is **exploratory** — when the answer depends on
something nobody knows yet and the plan will change once it is measured. Most of this
project's best work has been that shape: probe, discover the assumption was wrong, redesign,
continue. Handing that to a planner who cannot edit and an implementer who follows a fixed
plan just adds latency to a conversation.

If the owner asked for the harness, run it. If they asked for the *work*, do the work
directly — and say which you are doing, so nobody is surprised.

## Gate 1 — Plan
1. Spawn **planner** with the item path + any constraints.
2. Relay its plan (files, test plan, steps, risks, blocking questions).
3. **STOP for owner approval.** If the planner raised blocking questions, get the
   owner's answers first. Do not write code until the plan is approved.

## Gate 2 — Implement + QA
4. Spawn **implementer** with the approved plan. Relay its change summary + test output.
5. Spawn **qa** with the story. Relay its verdict + evidence.
6. If QA fails, loop the defects back to **implementer** (at most ~2 iterations), then
   re-run **qa**. If it can't converge, surface to the owner.

## Gate 3 — Review
7. Spawn **reviewer** on the working diff. Relay its verdict + ranked findings.
8. If REQUEST CHANGES, loop blockers/majors back to **implementer**, then re-QA and
   re-review the changed parts.

## Gate 4 — Owner review & hand-off
9. Present a concise final summary: what changed, test/QA/review status, and how to
   inspect the diff. Tick the story's acceptance checkboxes if met.
10. **Do not commit or push.** Offer the `ship` skill as the next step, only if the
    owner wants it.

## Rules of engagement
- **Rules-first:** if any agent hits an unspecified rule, stop and get an owner
  decision — never let an agent invent chess behavior.
- **Bring evidence to a gate, not a question.** Decisions have gone fastest when the
  options arrived with a measurement attached and a recommendation named. "Should en
  passant cross the seam?" is a slow question; "a pawn on `a5` attacks `h6`, so the chess
  wording already permits it — recommend yes, gated on the pawn's capture flag" is a fast
  one. The planner has a probe workflow for producing exactly this.
- **Report a finding that contradicts the story as a finding, not a failure.** Twice now a
  story's own acceptance criteria have turned out to be wrong. Rewrite the criterion, record
  what was believed and what is true, and carry on — do not quietly implement the wrong
  thing because it is what the checkbox said.
- Keep the owner in control at every gate; this harness is meant to be reviewed and
  iterated on. After a run, note anything that would make the next run smoother
  (agent prompt gaps, missing conventions) so we can improve the harness.
