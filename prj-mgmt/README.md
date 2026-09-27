# Project management — the map

Work is tracked as Markdown next to the code it describes. This file is the index: what
is authoritative, what is finished, what is still a question, and how to tell which is
which without reading everything.

If you read only one thing, read
**[the mirror portal spec](./epics/rules/mirror-portal-spec.md)**. It is the single source
of truth for what this game *is*. Everything else describes work; that describes rules.

---

## 1. Where authority lives

The project's founding lesson is that ambiguity, not bad code, broke the first engine
(CLAUDE.md §0). So each kind of question has exactly one place that answers it, and
everything else defers:

| Question | Authority |
| --- | --- |
| What are the rules? | [`epics/rules/mirror-portal-spec.md`](./epics/rules/mirror-portal-spec.md) |
| How do we work? | [`../CLAUDE.md`](../CLAUDE.md) |
| What order are we doing things in? | [`../roadmap.md`](../roadmap.md) |
| Why is the engine built this way? | [`epics/engine/adr/`](./epics/engine/adr/) |
| What does the code actually do? | the code, and its tests |

**A document is not authoritative because it sounds confident.** Several pre-reboot files
in `epics/game-logic/` describe rules that were never adopted, in implementation-ready
detail. They carry a superseded banner now; if you find one that does not, add it.

---

## 2. Status conventions

Every story should open with one of these, so its state is visible in the first line:

```markdown
> **Status: DONE (date).** …what shipped, and where the code is.
> **Status: BACKLOG — needs an owner decision on X.**
> **Status: SUPERSEDED by <link>.** …what it used to claim, and what is true instead.
```

Two rules learned the hard way:

- **Never delete a superseded story.** Say what it used to claim and why that is wrong.
  The wrong idea is often the interesting part — `epics/game-logic/arch.md` is the clearest
  record we have of the mental model the spec replaced.
- **Never claim a test exists without linking it.** A story once claimed a
  `portal-modes.e2e.ts` gave its work "a regression net"; the file had never existed, and
  anyone picking that story up would have started with false confidence.
  `npm run check:docs` now fails on a link that does not resolve, which is what caught it.

---

## 3. The epics

### `rules/` — what the game is  ✅ complete, with one question reopened
The spec plus the stories that built it. **All the rules are implemented**, and with every
portal flag off the engine reproduces published chess perft counts exactly.

**Changed 2026-09-22 — read this before anything else in `rules/`.** The spec gained a
governing principle (§2.1): **the movement space expands; the rules stay the same**, so a
piece attacks exactly where it can move, the pawn excepted as in chess. That retires §12's
quiet/capture split as the default model, returns the space to **six flags / 64 rulesets**,
and closes the adjacent-king case — a king that can step to a square controls it.
Notation was adopted the same day (§8.5, the `*` seam tag).
→ [`adjacent-kings.md`](./epics/rules/adjacent-kings.md) is the implementation story.

| | |
| --- | --- |
| [`mirror-portal-spec.md`](./epics/rules/mirror-portal-spec.md) | **The authority.** §4 sliders, §10 legality, §11 steppers, §12 quiet/capture split, §13 special moves |
| [`reconcile-core-to-spec.md`](./epics/rules/reconcile-core-to-spec.md) | ✅ deleted five contradictory notions of "mirror" |
| [`legality-layer.md`](./epics/rules/legality-layer.md) | ✅ check, pins, mate, stalemate |
| [`stepper-portal.md`](./epics/rules/stepper-portal.md) | ✅ knight/king/pawn cross by wrapping the file |
| [`move-capture-split.md`](./epics/rules/move-capture-split.md) | ✅ moving across and capturing across are separate rights |
| [`draw-rules.md`](./epics/rules/draw-rules.md) | ✅ repetition, 50-move, insufficient material — **and the finding that a seam-crossing bishop mates alone** |
| [`special-moves.md`](./epics/rules/special-moves.md) | ✅ promotion, castling, en passant — **and en passant across the seam** |
| [`adjacent-kings.md`](./epics/rules/adjacent-kings.md) | ✅ a piece attacks exactly where it can move — `isStandardRuleSet`, the 64 rulesets, the invariant as a property test, and [11 e2e tests](./epics/rules/adjacent-kings.e2e.ts). **The generator needed no change**: the rule was already obeyed, only unclassified |
| [`piece-capabilities.md`](./epics/rules/piece-capabilities.md) | ✅ the capability matrix: [40 e2e tests](./epics/rules/piece-capabilities.e2e.ts), six pieces × move / seam move / capture / seam capture, each with a flag-off control. Found the rook and queen almost untested |
| [`move-capture-split.md`](./epics/rules/move-capture-split.md) | ⚠️ superseded as the default (2026-09-22); kept, and still the best account of why move and attack must be generated separately |
| [`task-e2e-parallelism.md`](./epics/rules/task-e2e-parallelism.md) | 🔧 open housekeeping: `page.goto` flakiness; use `--workers=1` |
| [`task-lint-does-not-run.md`](./epics/rules/task-lint-does-not-run.md) | 🔧 open housekeeping: **ESLint has never run in this repo** |

### `engine/` — how it plays  🚧 in progress
| | |
| --- | --- |
| [`README.md`](./epics/engine/README.md) | why a *readable* engine is the goal, not only a strong one |
| [`adr/`](./epics/engine/adr/) | six decisions, each with the alternatives it rejected |
| [`architecture.md`](./epics/engine/architecture.md) | ✅ layers, branded types, observability, the guided tour |
| [`engine-core.md`](./epics/engine/engine-core.md) | 🚧 alpha-beta, ordering, quiescence and time done; TT, killers, SEE, PVS remain |
| [`evaluation.md`](./epics/engine/evaluation.md) | 📋 the hard part — piece values must be *derived*, not asserted |
| [`task-move-shape.md`](./epics/engine/task-move-shape.md) | ✅ closed |
| [`research/`](./epics/engine/research/) | prior art. Read before inventing; it predicted the quiescence explosion |

### `opponent/` — playing against it  ✅ mostly complete
[`opponent-integration.md`](./epics/opponent/opponent-integration.md) — Web Worker, three
difficulty levels, cancellation. The one open criterion is verifying the levels by a match,
which needs the self-play harness.

### `puzzles/` — a game made of positions  🚧 first set mined
[`README.md`](./epics/puzzles/README.md) is the epic;
[`mine-mate-in-2.md`](./epics/puzzles/mine-mate-in-2.md) ✅ shipped the solver, the miner
and a committed set.

**The pitch is narrow and testable: a puzzle that cannot exist in chess** — a position
whose answer changes when the seam closes. It is also the one product track **not blocked
by the evaluation problem**, because a forced mate is a rules fact proved by the
perft-verified generator, with no opinion from the evaluation in it.

### `balance/` — choosing the default rules by experiment  📋 designed, not started
[`README.md`](./epics/balance/README.md) is the experiment design, and
[`readiness-probe.md`](./epics/balance/readiness-probe.md) is what five probes measured
before any of it was built — **read that first**, because it moved the critical path off
throughput and onto evaluation.

| | |
| --- | --- |
| [`rule-flags.md`](./epics/balance/rule-flags.md) | ✅ shipped |
| [`readiness-probe.md`](./epics/balance/readiness-probe.md) | ✅ the measurements: 18 of 18 self-play games were repetition draws; the screen is affordable today; the board is not a cylinder |
| [`self-play-harness.md`](./epics/balance/self-play-harness.md) | 📋 after evaluation — carries the data contract |
| [`analysis-project.md`](./epics/balance/analysis-project.md) | 📋 the Python analysis and tuning layer |
| [`lab-view.md`](./epics/balance/lab-view.md) | 📋 many games from above — the second validation surface |
| [`search-engine.md`](./epics/balance/search-engine.md) | 📋 throughput, target **5–10×**, needed for confirmation not screening |
| [`variant-study.md`](./epics/balance/variant-study.md) | 📋 the experiment: **64 cells, full factorial**, staged |

The blocker is [`../prj-mgmt/epics/engine/evaluation.md`](./epics/engine/evaluation.md):
the engine scores every quiet move identically, so self-play is degenerate.

### `board-interactions/` and `user-moves/` — the UI
Mostly shipped (save/load, naming, export/import, theme). Still open:
[`history/undo-move.md`](./epics/board-interactions/history/undo-move.md) and
[`portal-modes-ux.md`](./epics/board-interactions/portal-modes-ux.md), which needs an owner
UX decision.

### `game-logic/` — ⚠️ pre-reboot, mostly historical
The oldest epic, written before the spec existed. Its per-piece stories have been
reconciled or superseded; **`arch.md` and `e2e-strategy.md` describe a rule that was never
adopted** and are kept only as a record. Two files here are current:
[`king/check-highlighting.md`](./epics/game-logic/king/check-highlighting.md) ✅ and the
e2e files, which run.

### `quality/` — security, accessibility and robustness  🆕 2026-09-27
[`README.md`](./epics/quality/README.md) holds what a consolidation pass found: the
findings that belong to no feature. **Production dependencies are clean and the board is
keyboard-operable with contrast far above AA** — the gaps are structural (no headings
anywhere) and one silent announcement (the puzzle reveal). The security model is written
down there too, including the line that matters: it changes the day accounts and telemetry
introduce a server.

### `components/` — Ionic wrappers
Shipped, and carrying the project's only real test debt: `SavedGamesList.spec.ts` fails the
naming validator and, with the Ionic input/button specs, accounts for the 13 failing
integration tests. None of it touches `src/game/*`.

---

## 4. `research/` — the reading behind the decisions

[`research/`](./research/) holds background that is *not* a work item: equilibrium and
balance, experimental design, self-play statistics, what makes a variant fun, and
[`variant-precedent.md`](./research/variant-precedent.md) — which is where the observation
that cylinder chess keeps its bishops colour-bound came from, and therefore why ours do not.

`epics/engine/research/` is the same idea for engines specifically, and it has already
earned its keep: it predicted both the quiescence explosion and the transposition-table
ruleset trap before either was hit.

---

## 5. How to add work

1. Put the story next to its epic, named for the behaviour, with a status banner.
2. Give it a **Summary** ("As a … I want … so that …"), **Acceptance Criteria** as
   checkboxes, and a **Test plan** naming real files.
3. Colocate its `*.e2e.ts` beside it. That is why Playwright's `testDir` is the repo root.
4. If it needs a rule the spec does not answer, mark the question **`[decision]`** and
   stop. Do not guess — that is the mistake this whole structure exists to prevent.
5. When it is done, tick the boxes and write what you *learned*, not only what you built.
   The most valuable paragraphs in this tree are the ones recording a finding that
   contradicted the plan.
