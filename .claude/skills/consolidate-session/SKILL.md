---
name: consolidate-session
description: >
  Introspect on a working session and fold what it taught into the harness: persistent
  memory, CLAUDE.md, prj-mgmt stories, agent prompts, skills and ADRs — and leave the next
  session a hand-off it can start from. Use when the owner says "consolidate session" /
  "consolidate our work", at the end of a long or milestone session, or whenever the
  session produced a finding that contradicts something already written down.
---

# Consolidate a session

**The harness is the product too.** The code plays mirror chess; the harness is what lets
the *next* session be better than this one, across a context wipe, a new model, or a
six-month gap. This skill is the deliberate moment for improving it, because the lesson is
cheapest to write down on the day it was learned and almost impossible to recover later.

You are doing this **yourself, inline** — not through subagents. It is reflective work on
material only this session has.

---

## 0. First, is there anything to consolidate?

Say so if there is not. A session that fixed a typo does not need a ceremony; a
consolidation pass that invents lessons to justify itself is worse than none, because it
dilutes the files that future sessions must trust.

There is something worth doing if any of these happened:

- A belief the repo recorded as true turned out to be **false**.
- A **decision** was made that future work must not relitigate.
- Something was **measured** that a future session would otherwise guess at.
- A **process** step failed, or one worked so well it should be the default.
- The owner **corrected** you, or expressed a preference.
- A session ended with **work in flight** that a successor must pick up.

---

## 1. Sweep the session for findings

Go back through the session — including your own thinking and the owner's words — and
write a rough list. Be specific and include the evidence. Aim for findings, not a diary:

> ❌ "We fixed the bishop crossing."
> ✅ "The crossing revision reversed two findings that were exhaustively enumerated and
> correct. A measurement is only as durable as the rule it was taken under — record the
> rule next to the number."

**Prefer the lesson that cost something.** The paragraph worth keeping is almost always
the one where a plan met a measurement and lost. If every finding in your list is a thing
that went well, you have written a summary rather than a consolidation — look again at
where you were wrong, where you were slow, and where you nearly shipped something false.

---

## 2. Route each finding to exactly one home

This is the whole job, and getting it wrong is how a repo ends up with five places that
half-say the same thing. Ask **"who needs this, and when?"**

| The finding is… | Home | Why there |
| --- | --- | --- |
| A fact about **the game's rules** | `prj-mgmt/epics/rules/mirror-portal-spec.md` | One authority; code derives from it |
| A fact about **what the code does** | a test, or a doc comment on the code | It can then be *checked*, not just believed |
| A **measurement** that cost compute | a test that re-derives it (gated if slow) | A paragraph cannot be re-run |
| **Why the architecture is this way** | an ADR in `prj-mgmt/epics/engine/adr/` | Includes the rejected alternatives |
| **What state the work is in** | the `prj-mgmt` story, with its status banner | Where the next person looks first |
| A **reusable technique** | `docs/design-patterns/` | Named, with what it costs |
| A rule about **how we work** | `CLAUDE.md` | The operating manual, loaded every session |
| A rule about **one delivery phase** | that `.claude/agents/<phase>.md` | Only that agent needs it |
| A rule about **an orchestration** | that `.claude/skills/<name>/SKILL.md` | Only that flow needs it |
| Something the **owner prefers** | a `feedback` memory | Survives a context wipe; not repo-specific |
| **Where we left off** | a `project` memory + §5 below | Front-loads the next session |

**One home, plus links.** If a finding genuinely belongs in two places, put the substance
in one and a one-line pointer in the other. Duplicated prose drifts, and the copy that
drifts is the one someone will read.

**Never delete a superseded claim — strike it through and date it.** The replaced text is
usually more instructive than the replacement, because it shows how a careful person got
it wrong. This repo's best paragraphs are old wrong ones with a line through them.

---

## 3. Update the memory directory

Persistent memory is the only thing here that survives a context wipe, so it carries what
a future session **cannot reconstruct from the repo**: decisions, preferences, measured
facts that turned out to contradict the obvious, and the hand-off.

- **One fact per file**, with the `name` / `description` / `metadata.type` frontmatter.
  `user` · `feedback` · `project` · `reference`.
- **Add one line to `MEMORY.md`** for every new file. That index is what gets loaded, so a
  memory missing from it is a memory that does not exist.
- **Correct, don't accumulate.** When a session falsifies a memory, rewrite that file —
  and if the reversal is interesting, keep the file and say what it used to claim, as
  `mirror-chess-bishop-is-mating-material.md` does. A memory that is quietly wrong is worse
  than no memory, because it is trusted.
- **Link memories** with `[[name]]`. The graph is how a future session finds the second
  thing it needed to know.
- Do **not** store what the repo already records — code structure, git history, anything
  in `CLAUDE.md`. Memory is for what is true *about the project* and not written in it.

---

## 4. Update the harness files

Work outward from the most-loaded file:

1. **`CLAUDE.md`** — the operating manual, and the closest thing this project has to a
   constitution. Add a rule only if it would have changed what you did today. Prefer
   sharpening an existing section to adding a new one; it is read every session, and every
   line costs attention. If a §0-style "lesson" table row is now false, correct it **in
   place with the reversal visible**.
2. **`.claude/agents/*.md`** — a lesson that belongs to planning, implementing, QA or
   review goes in that agent's prompt, not in CLAUDE.md. These are the prompts that run
   when the harness runs.
3. **`.claude/skills/*/SKILL.md`** — including this one. If the consolidation was rough in
   some way, fix it here while you remember.
4. **`prj-mgmt/README.md`** — the map. If an epic changed state, or a story was superseded,
   the map must say so in its first lines.
5. **`readme.md`** — only for user-visible changes, and in the user's language.

---

## 5. Leave the next session a hand-off

**This is the step most likely to be skipped and most likely to be missed.** A session ends
with context that evaporates: what you were about to do, which thread was loose, what you
would check first.

Write it as a `project` memory (one per active front, not one giant file), containing:

- **Where we left off** — the last thing that landed, and whether it is committed.
- **What to do next**, concretely enough to start without re-deriving the plan. Name files,
  commands, and the story path.
- **What to front-load** — the two or three documents to read *first*, in order. Not
  everything; the point is to make the first five minutes cheap.
- **What is in flight or unverified** — a half-migration, a measurement not yet re-run, a
  test that is green for a suspicious reason.
- **Known traps** — the things that cost this session an hour. Port conflicts, a slow gate,
  an API that looks right and is not.

Then put a pointer to it in `MEMORY.md` *and*, if the work is a tracked item, in the
`prj-mgmt` story's status banner — so it is reachable from the repo as well as from memory.

---

## 6. Verify, then report

- `npm run check:docs` — a consolidation that adds links must not break any.
- Re-read the diffs of `CLAUDE.md` and any memory you changed. Ask of each line: *would
  this have changed what I did today?* Delete it if not.
- Report to the owner: what was learned, where each lesson went, and **what you chose not
  to record and why.** The second half is the part they can disagree with.

**Do not commit.** Consolidation is still work for the owner to review; `ship` is a
separate, asked-for step.

---

## Constitutional changes get more than this

Some sessions do not merely teach a lesson — they change what the project *is*: a rule in
the spec, an architectural decision, the meaning of a core type. The crossing revision of
2026-10-03 was one (`prj-mgmt/epics/rules/diagonal-crossing.md`).

When that happens, consolidation is not enough on its own. The shape that worked:

1. **Write the change down and get it decided explicitly**, before any code moves. Name it
   as a reversal if it is one, and quote the owner.
2. **Milestones that each end green**, so the repo is never in a state where it believes
   two things at once. Spec first, code second, then re-measure, then data, then tests.
3. **List what the change puts in doubt** — every claim that rests on the old rule — and
   **re-measure each one**. Expect to be surprised: of six claims re-measured that day, one
   survived with a different example and one reversed in the *opposite* direction from the
   prediction.
4. **Keep the external oracle fixed.** All-flags-off perft did not move, which is what made
   the change safe to attempt at all. Find the equivalent before starting.
5. **Supersede in place, everywhere.** Spec, stories, memories, doc comments, readme.
   **Grep for the claim's own words across the whole repo, `src/` included** — not just the
   files you expect to be wrong. The 2026-10-03 crossing revision updated the spec, four
   stories, two memories, the readme and `eval.ts`, and still left `PromotionPicker.tsx`
   telling players that a lone bishop mates. It survived six days because the sweep grepped
   `prj-mgmt/` and `docs/` but not the components.
6. Only then consolidate the *process* lessons, with this skill.
