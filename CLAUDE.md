# CLAUDE.md — Mirror Chess operating manual

Guidance for Claude Code (and human contributors) working in this repo. Read this
first. It captures **how we work**, not just what the code is.

---

## 0. Why this file exists (the lesson)

The first build of Mirror Chess produced a working board UI but a **broken rules
engine**. The reason was not bad coding — it was that the **mirror rule was never
formally specified**. Each session invented its own interpretation, so `moves.ts`
ended up with five incompatible notions of "mirror" and the story files contradict
the code (see [readme.md → Known issues](./readme.md#known-issues)).

The reboot fixes the *process*, not just the code:

> **Rules-first.** No engine work ships until the mirror rules exist as a single,
> testable specification. Everything else (research, planning, implementation, QA,
> review) hangs off that spec.

When in doubt, don't guess a rule — stop and get it decided (see §11).

### The second lesson, learned since

Writing the rules down was necessary and **not sufficient**, because the rules that hurt
most were the ones nobody thought to write down — the ones *inherited from chess without
noticing*. Every one of these was believed, and every one was wrong:

| Inherited belief | What the seam actually does |
| --- | --- |
| "King and minor piece cannot mate" | A bishop that captures across the seam **mates a lone king alone** |
| "En passant is a local rule between adjacent files" | It happens between pawns **seven files apart** |
| "A castle can only be stopped by pieces near the king" | A bishop forbids it **from the opposite corner** |
| "A bishop is colour-bound, so the pair is valuable" | A seam hop flips square colour; the pair is near worthless |
| "Piece-square tables reward central pieces" | A knight on `a4` attacks as many squares as one on `d4` |

None was found by thinking harder. Each was found by **measuring** — a throwaway probe, an
exhaustive enumeration, a benchmark. So the rule that follows the rule:

> **Don't inherit a chess fact. Check it.** If a plan rests on something true of chess,
> the plan owes a measurement (§8, "probe before you specify"). A spec is only as good as
> its authors' imagination; a perft count and an enumeration are not.

---

## 1. What Mirror Chess is

Standard 8×8 chess plus a **mirror / projection** mechanic across the vertical
center seam (files a↔h, b↔g, c↔f, d↔e). The mental model the owner has referred to
is a **"tri-board"** projection (a center board flanked by mirrored side boards).
That model is **not yet written down coherently** — writing it down is job #1.

**Product vision (north star):** a mobile + web app where people play mirror chess
against each other, log in with Google, connect social accounts, track scores, and
**propose new rules**. A fast authoritative engine (candidate: **Rust**) serves the
front end over the network so all clients agree on legality.

---

## 2. Architecture & layers

| Layer | Path | Rule |
| --- | --- | --- |
| **Game core** (source of truth) | `src/game/*` | Pure, deterministic, immutable. No React, no I/O, no globals. **Never optimised** — it is the correctness oracle (ADR 0002). |
| **Engine** | `src/engine/*` | May be clever. Pure and deterministic below `host/`; only `host/` gets a clock or a thread. |
| **Views** | `src/components/*` | Render-only. Call the game API; never encode rules. |
| **Shared** | `src/shared/*` | Persistence, fixtures, UI selectors/testids. |
| **Shell** | `src/App.tsx`, `src/main.tsx` | Thin state container / bootstrap. |

Key core files: `types.ts`, `coord.ts` (`toIndex`, `algebraic`, `mirrorFile`), `moves.ts`
(`legalMovesFor`), `attacks.ts`, `rays.ts`, `advance.ts`, `reducer.ts` (`reduceMove`),
`draw-rules.ts`, `fen.ts`, `perft.ts`, `setup.ts`.

**Dependency direction:** UI → engine → game. Never the reverse; `src/game/*` importing
`src/engine/*` would destroy its independence as an oracle. Checked by
`npm run check:layers`, not by convention.

### The three generation contracts

`src/game/types.ts` splits what looks like one "position" into three, and the split is
load-bearing rather than decorative — it is the same one FEN makes:

| Type | Adds | Answers |
| --- | --- | --- |
| `Position` | board, rules | what attacks what |
| `MovePosition` | castling rights, en-passant square | what moves exist |
| `GameState` | turn, clock, repetition history | how the game stands |

Attack generation genuinely cannot see castling rights, so a class of bug is unwritable.
**Search sees `MovePosition` and never `GameState`** — that is what stops the draw rules
leaking into a perft count, which is a real and famous way to get a wrong number.

---

## 3. Delivery workflow

Every non-trivial change moves through these phases. For substantial work, spin up
the matching skill/agent (§5); for small changes, do the phase inline.

1. **Research** — understand the problem and prior art (chess engines, rule
   variants, existing code). Capture findings in the relevant `prj-mgmt` doc.
2. **Plan** — write/refresh the story + acceptance criteria + a task list. Use plan
   mode (`EnterPlanMode`) for anything architectural; get approval before large edits.
3. **Implement** — tests first for game logic. Small pure functions. Keep the core pure.
4. **QA** — run unit + integration + e2e; verify acceptance criteria; check a11y and
   both themes. Report failures honestly with output.
5. **Code review** — self-review against §8 checklist; use `/code-review` for the
   working diff (or `/code-review ultra` for a deep multi-agent pass when asked).
6. **Commit** — on a **feature branch**, conventional message, one logical change.
   Commit/push only when the user asks (see §7).

## Branching & commits

- Default branch: `main`. Active integration branch: `dev`. **Do not commit
  directly to `main`.** Branch feature work off `dev`:
  `feat/<epic>-<short-slug>`, `fix/<slug>`, `chore/<slug>`.
- One logical change per commit; imperative subject; body explains *why*.
- **Never commit or push unless the user asks.** When they do, open a PR into `dev`
  using `PULL_REQUEST_TEMPLATE.md`.

---

## 4. Project management (`prj-mgmt/`)

Work is tracked as Markdown in a hierarchy:

```
epic/           A large capability area (e.g. game-logic, board-interactions)
  feature/      A cohesive slice (e.g. bishop, persisted-game)
    story.md    A user story with acceptance criteria
    *.e2e.ts    (optional) the Playwright test that verifies the story
    bug.md      A defect writeup (repro, expected, actual)
    task.md     A unit of implementation work
```

**Start at [`prj-mgmt/README.md`](./prj-mgmt/README.md)** — the map of what exists, what
is authoritative, and what state each epic is in.

**Story format:** a `Summary` ("As a … I want … so that …"), `Acceptance Criteria`
(checkboxes), optional `Notes` / `Test Cases` / `Implementation Notes`. Keep stories
small enough that one PR closes them. When a story is verified, its acceptance
boxes get checked and its e2e passes.

**Every story opens with a status banner** — `DONE (date)`, `BACKLOG — needs a decision on
X`, or `SUPERSEDED by <link>` — so its state is visible in the first line. Three conventions
that exist because their absence caused a problem:

- **Never delete a superseded story.** Say what it used to claim and what is true instead.
  `epics/game-logic/arch.md` is the clearest record of the mental model the spec replaced,
  and it is *only* safe to keep because it now carries a banner saying so.
- **Never claim a test exists without linking it.** A story once claimed a regression net
  that had never existed; anyone picking it up would have started with false confidence.
  `npm run check:docs` now fails on a link that does not resolve.
- **When you close a story, write what you learned, not only what you built.** The most
  valuable paragraphs in this tree are the ones recording a finding that contradicted the
  plan — and twice now, that finding has been a story's own acceptance criteria being
  wrong. Rewrite the criterion and say why; do not quietly implement the wrong thing
  because it is what the checkbox said.

---

## 5. The harness: agents, skills, introspection

A repeatable harness lives in `.claude/`. Four subagents do the work of each phase;
two skills orchestrate them.

| Phase | Tool | File | Job |
| --- | --- | --- | --- |
| Plan | `planner` agent | `.claude/agents/planner.md` | Story → ordered plan, files, test plan, risks. Read-only. |
| Implement | `implementer` agent | `.claude/agents/implementer.md` | Execute the plan tests-first; keep the core pure. |
| QA | `qa` agent | `.claude/agents/qa.md` | Run all tiers + build; check acceptance criteria, a11y, themes. Read-only. |
| Review | `reviewer` agent | `.claude/agents/reviewer.md` | Review the diff vs spec + standards; ranked findings + verdict. Read-only. |
| Orchestrate | `deliver-story` skill | `.claude/skills/deliver-story/` | Run plan→implement→QA→review with an **owner-review gate** at each step. |
| Ship | `ship` skill | `.claude/skills/ship/` | Branch off `dev`, conventional commit, PR into `dev`. Only when asked. |

**How to run:** the owner invokes `deliver-story` (e.g. "run the harness on
`<prj-mgmt path>`"). The orchestrator delegates to the agents and pauses for owner
review at each gate; nothing is committed until the owner runs `ship`.

**When it fits, and when it does not.** Be honest about this: most of the work so far —
the draw rules, the special moves, the engine, the opponent — was done **directly, in
conversation**, not through the harness. That is not a failure of either. Three gates and
four subagents earn their overhead on a self-contained story with settled rules, where a
plan can be written, approved and executed without steering. They are the wrong shape for
*exploratory* work, where the answer depends on something nobody knows yet and the plan
changes the moment it is measured — which is most of what this project has turned out to
be.

Default to doing the work directly and say so. Reach for `deliver-story` when the owner
asks for it, or when a story is genuinely mechanical.

**Session introspection.** At the end of a working session, capture what would make
the *next* session smoother — sharper rules, missing tests, harness gaps — into
persistent memory and/or a `prj-mgmt` task, and refine this file and the agent
prompts. The harness is meant to compound: after each `deliver-story` run, fold what
was rough back into the relevant `.claude/agents/*.md` or `.claude/skills/*`.

> Do not spawn subagents unless the owner asks or invokes `deliver-story`. Prefer
> doing a phase inline with your own tools for small changes.

---

## 6. Engine strategy

**Rules-first, then choose the implementation.** Steps 1 and 2 are **done**:

1. ~~**Write the spec.**~~ ✅ `prj-mgmt/epics/rules/mirror-portal-spec.md` — every piece,
   with worked examples that run as unit tests.
2. ~~**Reconcile the TS core.**~~ ✅ The five contradictory notions of "mirror" are gone,
   all the rules are implemented, and with every portal flag off the generator reproduces
   **published chess perft counts** — Kiwipete depth 4 (4,085,603) and the rest.
3. **Evaluate a native engine.** Still open, and now *better informed*: a TS engine exists
   and its bottleneck is measured. A node costs ~300 µs because the reference generator
   copies the board and re-scans attacks per legality test — tens of thousands of nodes per
   second where a chess engine manages millions. Before concluding "TypeScript is too
   slow", do the work that would make *any* language fast: make/unmake instead of copying,
   attack-from-square tables, typed arrays
   (`prj-mgmt/epics/balance/search-engine.md`). The variant study is the forcing function;
   decide from that benchmark, not in the abstract.
4. **Define the network contract** (`GameState` in ↔ legal `Move[]` / applied
   `GameState` out) so front end and engine evolve independently. The worker protocol in
   `src/engine/host/protocol.ts` is a first draft of exactly this — and it needed **no
   serialisation layer**, because the core is plain data.

Do **not** add chess/state/networking libraries to the current core without an
explicit decision — the core stays dependency-light and pure.

---

## 7. Coding standards (condensed)

Ported from `.cursorrules`. Priorities: **correctness > performance > DX > style.**

- **TypeScript strict**; never weaken `strict` / `exactOptionalPropertyTypes`.
- **Purity & immutability in `src/game/*`** — no mutation except locals, no side
  effects, deterministic outputs. `readonly` on exported arrays/objects.
- **No magic strings** — centralize constants (`WHITE`, `BLACK`, kinds, testids).
- **Named types** for any shape ≥2 props or reused across modules. Domain types in
  `src/game/types.ts`; reusable cross-domain types in `src/shared/<domain>/types.ts`.
- **Components:** one per file; non-trivial → folder with `.tsx`, `.types.ts`,
  `.spec.tsx`/`.test.ts`, `.mocks.ts`. Props via named `interface`, no inline literals.
- **Style:** verbs for functions, nouns for types; prefer `for…of` over `forEach`;
  small pure helpers with explicit I/O.
- **Docs:** JSDoc every export (purpose, invariants, `@param`/`@returns`, perf/failure
  notes). Update `readme.md` on user-visible changes.
- **A11y:** board is the primary interaction; `aria-label` on squares; no
  visual-only cues (capture vs move must be distinguishable non-visually).

---

## 8. Testing & review checklist

**3-tier tests, enforced by `scripts/validate-test-naming.js`:**

| Tier | File | Runner | Notes |
| --- | --- | --- | --- |
| Unit (priority) | `*.test.ts(x)` | Vitest | Pure logic, **no** testing-library |
| Integration | `*.spec.ts(x)` | Vitest + Testing Library | DOM/component |
| E2E | `*.e2e.ts` | Playwright | Colocated with the `prj-mgmt` story |

Bugfixes add a failing unit test (+ e2e if user-facing) that the fix turns green.
Name tests by behavior, not implementation. Commands: `npm run test`,
`npm run test:int`, `npm run e2e -- --workers=1` (see `package.json` for the full set).

**Also run, and they are the only static checks that execute** — ESLint does *not* run in
this repo at all, because a legacy `.eslintrc.cjs` meets ESLint 9's flat config:

| | |
| --- | --- |
| `npm run check:layers` | engine layer boundaries, and no clock or randomness outside `host/` |
| `npm run check:docs` | every local link in every `.md` resolves |
| `npm run check:naming` | the 3-tier test naming convention |
| `PERFT_DEEP=1 npm run test` | the deep published perft counts (~1 min). After **any** change to move generation, `applyMoveToBoard`, or castling / en-passant bookkeeping. |

### Prove, don't assert

The strongest guarantees here are **comparisons**, not hand-written expectations. Prefer
one of these over a list of examples whenever the shape allows it:

- **Against the outside world.** All flags off *is* chess, so published perft counts apply.
  This is the only check in the project verified by an authority outside it.
- **Against an unoptimised twin.** `src/game/*` for `src/engine/*`; `negamax` for
  `alphaBeta`; `evaluateVerbose` for `evaluate`. An optimisation that changes the answer is
  a bug no benchmark will reveal. If a technique changes the answer *by design* — quiescence
  does — make it a **flag**, so the comparison stays possible.
- **By exhaustion.** For a claim about *all* positions, enumerate them. "King and bishop
  cannot mate" was inherited from chess, believed, written into acceptance criteria — and
  false. A few seconds of enumeration found the counterexample.

Keep a slow proof and gate it; record its runtime in the doc comment so nobody deletes it
later for being slow.

### Probe before you specify

Before planning around any claim about how the seam behaves, **check it**. Write a
throwaway `src/game/zz-probe.test.ts`, run it, read the output, delete it. It costs a
minute, and every time it has been run it changed the plan:

| Probe | Answer | Consequence |
| --- | --- | --- |
| Does a pawn on `a5` attack `h6`? | yes | en passant crosses the seam |
| Do castling squares touch an edge file? | no | the flagged "does the king's step wrap?" question is unreachable — leave it unspecified |
| Does a lone bishop mate? | yes, if it captures across | an acceptance criterion was wrong |
| What does the mobility eval term cost? | 1465× material | evaluation redesigned |

### When an e2e test goes *green*, suspect the fixture too

The dangerous version of the rule below, because nothing draws your attention to it. Four
e2e tests for the king rule passed immediately and proved nothing: their fixtures were two
lone kings, which is **insufficient material**, so the game was already drawn, the board
rendered no move hints at all, and every "this square is not offered" assertion was
trivially true. A pawn each fixed it.

Any e2e that asserts an **absence** — no hint, no dialog, no message — should first assert
a presence in the same position, so a fixture that renders nothing cannot pass. Give
two-king positions some material; check the status line says `Turn: …` and not `Draw — …`.

**Break a new suite on purpose, once.** Forty capability tests passed on their first run,
which is exactly when a suite deserves least trust. Pointing one assertion at a square that
should *not* have that marker failed precisely the two tests that read it — a minute's work
for the difference between "it passes" and "it can fail". Then put it back.

**Verify a fixture against the engine before writing assertions on it.** Two fixtures in
that suite were illegal positions: one left White in check from a bishop attacking `e1`
*through the seam*, the other let White capture a king. Both looked obviously fine.

### Look at the thing

Assertions encode what you thought to check. A screen has a dimension they do not reach.

The first puzzle screen never played the solution: the reveal described a bishop
travelling `f8 → h6 → a6 → c4` while the bishop sat on `f8` and the knight it had
supposedly captured sat on `c4`. **Seventeen tests passed** — nine integration, eight e2e —
because every one of them asserted on *text*: the verdict, the reveal, the prompt. A single
screenshot caught it in seconds.

So for anything with a UI, take a screenshot and **look at it** before calling it done.
Then add the assertion the screenshot just taught you (here: the piece is on the
destination square, and gone from the origin).

### When a test goes red, suspect the fixture first

The core is perft-verified, so a **newly written** failing test is far more often a bad
position than a broken engine — roughly eight times out of ten in practice. Check the move
is actually legal and the position is really mate before touching the implementation.
Two that have caught us: dedupe keeps the *standard* move when a square is reachable both
ways (so that `crossedSeam` move does not exist), and `state.inCheck` describes whoever is
to move **now** — after a move that is the opponent.

**Review checklist before proposing a PR:**
- [ ] Types as strict or stricter; new exports documented
- [ ] Unit + integration + e2e pass; `npm run build` clean
- [ ] `check:layers`, `check:docs`, `check:naming` pass
- [ ] Perft counts unchanged if move generation was touched (`PERFT_DEEP=1`)
- [ ] Any optimisation names its twin and the test that compares them
- [ ] Every new constant states its provenance (measured / cited / guessed)
- [ ] New engine modules answer "what does the mirror seam change about this?"
- [ ] No side effects introduced in `src/game/*`
- [ ] No unapproved dependencies
- [ ] UI responsive + a11y intact in light **and** dark themes
- [ ] Acceptance criteria of the linked story are met — **or amended, with the finding
      that contradicted them written down**

**Known-failing, and not a regression:** 13 integration tests across 3 files
(`SavedGamesList.spec.ts` plus the Ionic input and button specs), and `check:naming` flags
the first. Pre-existing component debt; touches nothing in `src/game/*`. Confirm the count
is unchanged rather than reporting it afresh.

---

## 9. Serena (semantic code tools)

[Serena](https://github.com/oraios/serena) is registered as a **local-scope** MCP
server for this repo, providing symbol-level navigation/editing (find symbol,
references, targeted edits) that's cheaper than reading whole files. Project config
lives in `.serena/` (git-ignored).

**Prefer Serena's symbol tools** for locating and editing code in `src/` once the
server is connected (restart Claude Code / approve the server after setup).

**Setup on a fresh machine** (requires `uv`; Windows here also needs
`git config --global http.sslBackend schannel` and `UV_NATIVE_TLS=1` because the
network does TLS interception):

```bash
claude mcp add serena -s local \
  -e UV_NATIVE_TLS=1 \
  -- <abs-path-to>/uvx --native-tls \
     --from "git+https://github.com/oraios/serena@34342a9d00b0da4efb3b1e92710f9d7c4ad2edcf" \
     serena start-mcp-server --context ide-assistant --project <abs-repo-path>

# one-time symbol index (also auto-creates .serena/project.yml):
<abs-path-to>/uvx --native-tls --from "git+https://github.com/oraios/serena@<pin>" \
  serena project index <abs-repo-path>
```

Bump the pinned commit to update Serena.

---

## 10. Guardrails

- ❌ Weaken TS strictness · introduce global/mutable state in `src/game/*` · encode
  rules in the UI · change public exports without tests · add deps without a decision.
- ❌ Commit to `main`, or commit/push without being asked.
- ❌ Implement a mirror rule that isn't in the spec. If the spec is silent, ask (§11).
- ✅ New rules are composable and test-first · refactors preserve behavior (add
  characterization tests first) · the core stays pure and portable.

---

## 11. Open decisions (blocking)

1. ~~**The mirror rules.**~~ **Settled and complete.** `mirror-portal-spec.md` now covers
   §4 slider transit, §10 legality, §11 stepper wrap, §12 the quiet/capture split and §13
   promotion, castling and en passant. If the spec is silent on a case, still stop and ask
   — that rule has not changed, and it has paid off every time it was followed.
2. ~~**[decision] Notation.**~~ **Settled 2026-09-22: spec §8.5**, standard SAN with `*`
   marking a seam crossing (`Bb3–h4*`, `Bxh4*+`, `axb6 e.p.*`). An all-flags-off game
   notates as ordinary chess, so a record degrades to valid PGN. This unblocked the move
   log, undo, export and the network protocol.
3. **Engine path:** TS core vs. a native (Rust/WASM) engine. See §6 — do the board-
   representation work before concluding the language is the problem.
4. **Product scaffolding order:** when to introduce Capacitor (mobile), auth, and the
   networking layer.
5. **Default ruleset.** Currently "every piece crosses", but this is an *experimental*
   question — see §12 and `prj-mgmt/epics/balance/`. Two competing predictions are now on
   record: seam-crossing kings are hard to corner (raises draws), seam-crossing bishops mate
   alone (lowers them). The study exists to say which dominates.
6. ~~**[decision] How large is the rule space?**~~ **Settled 2026-09-22: 64 rulesets.**
   The governing principle is now in the spec (§2.1): **the movement space expands; the
   rules stay the same**, so a piece attacks exactly where it can move — the pawn excepted,
   as in chess. Each non-pawn piece has one portal right; the pawn has capture-only. §12's
   quiet/capture split is retired as the default and kept as an experimental extension, and
   the 11-slot token format is unchanged (ADR 0004 is append-only), so every token ever
   minted still parses. → `prj-mgmt/epics/rules/adjacent-kings.md`

   **The rule this protects:** a king that can *step* to a square *controls* it. Under the
   split, a king could cross the seam without attacking across it, and so move into check
   invisibly — measured, not argued (`prj-mgmt/epics/balance/readiness-probe.md` §3).

---

## 12. The engine is a teaching artifact (first-class)

The engine has **two deliverables of equal standing**: it must play well, *and* it must
be something a person can read and learn how chess engines work from. The second is a
design constraint, not documentation added afterwards, and it is allowed to cost
performance. Full detail in `prj-mgmt/epics/engine/`.

What this changes about how we build:

- **Two implementations, one oracle** (ADR 0002) — and it has turned out to be the
  project's central habit rather than one decision. `src/game/*` stays pure, obvious and
  spec-shaped forever; `src/engine/*` may be clever and is tied to it by differential
  perft. The same pattern then recurred *inside* the engine: `negamax` exists to prove
  `alphaBeta`, and `evaluateVerbose` to prove `evaluate`. **Whenever you optimise
  something here, the question is "what is its twin?"** Never optimise a reference; never
  delete one.
- **Cleverness carries a receipt.** Any non-obvious optimisation needs a comment
  explaining the trick *and* a differential test proving it. Clever code with neither is
  a defect however fast it runs. If a technique changes the answer *by design* —
  quiescence does — make it a **flag**, so the comparison stays available.
- **Rules live in tables, not in branches** (ADR 0003). Rule flags are compiled into
  precomputed ray paths and stepper targets once per search; the hot loop never tests a
  flag and stays geometry-agnostic.
- **Named domain types.** `Centipawns`, `Depth`, `Ply` — never a bare `number` whose
  meaning lives in the variable name. `Depth` and `Ply` are distinct and get confused.
- **No unexplained constants.** Every magic number states its provenance: measured,
  standard-and-cited, or guessed-and-flagged-for-tuning. This one has already paid: when
  the mobility term turned out to cost 1465× the material term, the fix was obvious
  precisely because its weight was already labelled *guessed* and the piece values already
  said *inherited from chess, probably wrong here*. A labelled wrong number is cheap to
  correct; an unlabelled one is load-bearing by accident.
- **Module doc comments teach**, in this order: what is this, why is it here, how does
  it work, and *what does the mirror seam change about it*. The last one is the highest
  value and the easiest to skip.
- **Observability is a feature**, serving debugging, the study and the learner at once:
  principal variation, per-term evaluation breakdown, node counts. It must compile out
  with zero hot-path cost.
- **Architecture decisions get an ADR** in `prj-mgmt/epics/engine/adr/`, including the
  rejected alternatives — that section is the most instructive part for a reader.
- **Patterns are named and cross-linked** in `docs/design-patterns/`. Each note states
  the problem, the code here that uses it, what it buys and **what it costs**. Read it
  before adding a new abstraction; extend it when you add one.
- **The tour is the deliverable.** `docs/engine/README.md` explains how a chess engine
  works using this one as the text, each section ending with *what the mirror seam changes
  here*. It is checked by `npm run check:docs`, and a section it describes must actually
  exist — a guide that has drifted is worse than none. When you add an engine technique,
  add its section; that is not paperwork, it is the second deliverable.

Because the rules are feature-flagged, one engine plays 64 games, **including ordinary
chess with every flag off**. Treat that as the gift it is: it forces a real boundary
between "what the game is" and "how we search it", and it gives us published chess perft
numbers as an external correctness oracle.
