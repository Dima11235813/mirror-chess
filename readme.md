# Mirror Chess

A chess variant on a standard 8×8 board with an added **mirror portal**: the `a`-file and
the `h`-file are linked, so the board has no left or right edge. **One rule covers every
piece: the file wraps `a ↔ h`, and the rank does whatever the move was already doing.**

- **Sliders** (bishop, rook, queen) keep going: a ray that leaves the board across an edge
  re-enters on the other side and **continues in the same direction**. A bishop on `b3`
  reaches `a4` and carries on `h5, g6, f7, e8`.
- **Steppers** (knight, king, pawn) land across it by the same arithmetic. A knight on `a3`
  keeps all eight of its L-moves — `h5, g4, g2, h1` among them. Pawn captures wrap; pawn
  pushes do not, having no file component.
- **A diagonal stays a diagonal, so square colour is preserved.** A wrapping step changes
  the file by ±7, which has the same parity as ±1, and bishops are therefore colour-bound
  exactly as in chess. A ray is at most 7 squares long — also exactly as in chess.

> **Revised 2026-10-03.** Until then a slider *hopped* the seam at equal rank (`a4 → h4`),
> which flipped a bishop's square colour. That was wrong, and reversing it also reversed
> several things this file used to claim —
> [`diagonal-crossing.md`](./prj-mgmt/epics/rules/diagonal-crossing.md) has the migration
> and the measurements.

The long-term vision is a polished, projectable variant that can be rendered multiple
ways (2D board, later a 3D / "tri-board" projection) and played by people against
each other online.

> **Status: early prototype.** The mirror mechanic is now formally specified in
> [`prj-mgmt/epics/rules/mirror-portal-spec.md`](./prj-mgmt/epics/rules/mirror-portal-spec.md),
> and the game core is derived from it — the spec's worked examples run as unit
> tests. What is still missing is the legality layer (check, pins, castling,
> promotion, en passant) and everything above a single-device hot-seat prototype.
> See [CLAUDE.md](./CLAUDE.md) for the contributor/AI operating manual and
> [roadmap.md](./roadmap.md) for direction.

---

## The vision

- **Play mirror chess with other people** — a mobile and web app.
- **Log in with Google**, connect via social integrations, and **track scores**.
- **Let players propose new rules** — the variant is meant to evolve.
- **A fast, authoritative rules engine** (candidate: a Rust core) consumed by the
  front end over the network, so all clients agree on legality and outcomes.

None of the above is built yet. Today the repo is a single-device, hot-seat web
prototype. The vision is what the reboot is organizing toward.

---

## What actually works today

- **Board UI** (Ionic React): click a piece to select it; legal destinations are
  highlighted as hints; click a hint to move. Ordinary moves, captures and **portal
  moves** are all distinguishable — portal destinations are drawn as hollow rings, so
  they differ by shape and not only colour. Choosing a square your king's safety
  forbids explains why. File/rank labels are drawn on the board edges.
- **Check is shown, not just enforced**: the checked king, the piece giving check and
  the squares the check passes through are marked — including across the seam, so a
  check from the far side of the board can be traced back to its source. Every visual
  cue has a screen-reader counterpart in the square's label.
- **Pure game core** in `src/game/*`: standard chess move generation for all pieces,
  plus the **mirror portal for every piece**, derived from the rules spec — one crossing
  rule, applied to a slider's ray and to a stepper's jump.
- **Full legality**: check detection, self-check filtering (so pins and
  check-resolution work), checkmate and stalemate. Attacks travel through the seam,
  so a bishop can give check — or mate — from the far side of the board.
- **Games end**: draws by threefold repetition, the fifty-move rule and insufficient
  material, each announced by name. Insufficient material turns out to be **exactly
  chess's rule** — re-enumerated over every placement and every ruleset on 2026-10-03,
  after the crossing revision made bishops colour-bound again. It had been the one chess
  rule the seam changed; now it is the one it provably does not (`src/game/draw-rules.ts`).
- **All the rules**: promotion (with a picker offering all four pieces), castling, and
  en passant. Two of the three are untouched by the seam; **en passant is not** — a pawn
  on `a5` can take one that just played `h7–h5`, landing on `h6`. Castling needed no new
  rule, but a bishop can forbid it from the opposite corner of the board — `Ba3` covers
  `g1` by wrapping the seam on its first step.
- **Checked against published chess.** With every portal flag off this *is* chess, so the
  standard perft suite applies: start position to depth 5 (4,865,609), Kiwipete to depth 4
  (4,085,603), Positions 3–5. All match. `src/game/fen.ts` reads FEN, which is how those
  positions are distributed and what a bug report should carry.
- **Play against the engine.** Pick a side and a strength, and it plays. `src/engine/*` is
  negamax with alpha-beta, MVV-LVA move ordering, iterative deepening and quiescence search,
  over a deliberately geometry-free evaluation. It runs on a **Web Worker**, so the page
  never freezes while it thinks, and it announces its progress to screen readers.
  It wins a hanging queen, declines a poisoned capture, prefers mate to material, finds a
  two-move back-rank tactic on its gentlest setting, and finds a mate that exists *only*
  because of the seam — `Qa8–a1`, where the queen's wrapped diagonal covers the one flight
  square the king would otherwise reach.
  → **[A guided tour of the engine](./docs/engine/README.md)**, which explains how a chess
  engine works using this one as the text, and ends each section with *what the mirror seam
  changes here*. Plus a [glossary](./docs/engine/glossary.md).
- **Save / load games** to browser storage, name/rename/delete saved games, and
  **export/import** the saved-game list as a JSON file.
- **Light/dark theme** toggle.
- **Load a position from the URL** via a compact piece spec, e.g.
  `?board=w:Ke1,Qd1,Ra1;b:Kg8,Qd8&turn=white` (see `fromPiecesSpec` in `src/game/setup.ts`).
  `&rules=` picks the variant and `&clock=` presets the fifty-move counter.

What is **not** built: a move log, undo, notation, any networking, accounts, or mobile
packaging.

---

## Tech stack

| Area | Choice |
| --- | --- |
| UI | [Ionic React](https://ionicframework.com/) 8, React 19 |
| Build / dev server | Vite |
| Language | TypeScript (strict) |
| Unit / integration tests | Vitest (+ `@testing-library/react`) |
| E2E tests | Playwright |
| Routing | react-router-dom 5 |
| Lint / format | ESLint + Prettier |

The game core (`src/game/*`) is intentionally **pure and UI-agnostic** — plain
functions over immutable data — so it can later be replaced or mirrored by a
native (Rust) engine without touching the rules' definition of truth.

---

## Getting started

```bash
npm install
npm run dev        # Vite dev server at http://localhost:41960
```

### Build

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the production build on :41961
npm run preview:lan # ...and expose it on the LAN, to test on a phone
```

### Tests

The project uses a **3-tier** strategy with enforced file-naming (a build script,
`scripts/validate-test-naming.js`, fails the build on violations):

| Tier | Extension | Runner | Purpose |
| --- | --- | --- | --- |
| Unit (highest priority) | `*.test.ts(x)` | Vitest | Pure logic, no DOM, **no testing-library** |
| Integration (lowest priority) | `*.spec.ts(x)` | Vitest + Testing Library | Component / DOM behavior |
| E2E (medium priority) | `*.e2e.ts` | Playwright | User workflows, colocated with `prj-mgmt` stories |

```bash
npm run test          # unit (fast, local dev)
npm run test:watch
npm run test:coverage

npm run test:int      # integration
npm run e2e           # end-to-end (Playwright); needs the preview server
```

> Note: `readme` references to `npm run test:e2e` / `test:all` / `test:unit:*` are
> aspirational — the real script names are in [`package.json`](./package.json).
> Cleaning these up is a tracked task in the reboot.

---

## Repository map

```
src/
  game/                Pure chess core (source of truth for rules)
    types.ts           Coord, Piece, Board, Move, GameState
    coord.ts           index/algebraic helpers, mirrorFile()
    moves.ts           legalMovesFor() — standard + mirror move generation
    reducer.ts         reduceMove() — applies a legal move, flips turn
    setup.ts           initialPosition(), fromPiecesSpec()
    *.test.ts          Unit tests per piece / rule
  components/          React views (render-only; call the game API)
    BoardView.tsx      The interactive board
    ionic/             Wrapped Ionic components (button, input, theme)
    Saved*.tsx         Save/load games UI
  shared/              Persistence, board fixtures, UI selectors/testids
  App.tsx              Thin state container
prj-mgmt/              Project management: epics → features → stories → tasks/bugs
qa/                    QA fixtures (e.g. sample saved-game export)
scripts/               Build tooling (test-naming validator)
```

## Project management

Work is tracked as Markdown under `prj-mgmt/` in a hierarchy of
**epic → feature → story → task / bug**. Each user story carries acceptance
criteria and, where relevant, a colocated `*.e2e.ts` that verifies it. See
[CLAUDE.md](./CLAUDE.md) for the conventions the reboot standardizes on.

---

## Known issues

Resolved by the rules-first reboot: the mirror rule now has a single specification,
`moves.ts` is derived from it, and the story files agree with the code. What remains:

- **The engine is slow, and the board is why.** It reaches depth 4 on a middlegame in about
  a second and depth 6 in minutes — roughly tens of thousands of nodes per second where a
  chess engine manages millions. The cause is not the search: a single node costs ~300 µs
  because the reference move generator copies the board and re-scans for attacks on every
  legality test. The fix is make/unmake and attack tables
  ([`search-engine.md`](./prj-mgmt/epics/balance/search-engine.md)), with the current
  generator kept as the oracle they are checked against. A transposition table would help
  the node *count*, but not this gap.
- **Quiescence is 80–94% of the search**, and the seam roughly triples the tree. The
  predicted quiescence explosion is real and measured; it is the reason evaluation is
  material-only.
- **The three difficulty levels are asserted, not measured.** They differ only in search
  depth, which is the right design, but "each level beats the one below" needs the
  self-play harness to verify.
- **Piece values are inherited from chess and are probably wrong.** They are flagged as
  such in `src/engine/eval.ts`. The seam invalidates the geometric assumptions every chess
  engine is built on — piece-square tables are near-meaningless, bishops are not
  colour-bound, and each rank is a cycle — so evaluation starts deliberately geometry-free
  and the values are meant to be *derived* from self-play rather than asserted.
  See the [engine epic](./prj-mgmt/epics/engine/README.md).
- **No move *log*.** `GameState` now carries the history the draw rules need —
  positions since the last irreversible move, plus the halfmove clock — but not the
  sequence of *moves*, so undo, a move log and notation still have nothing to read.
- **Balance is untested.** Now that every piece crosses the seam, kings are much
  harder to corner and edge files are stronger. Which pieces *should* cross is being
  turned into an experiment rather than a guess: each piece's portal becomes a feature
  flag, an engine plays all 64 combinations against itself, and the best-balanced one
  becomes the default. See the
  [balance epic](./prj-mgmt/epics/balance/README.md).
- **A bishop *was* mating material here, and is not any more.** Worth keeping as a
  cautionary note rather than deleting. Until 2026-10-03 `Ka1, Bd4` mated a lone `Kh8`,
  because a crossing preserved rank and so flipped the bishop's square colour, letting one
  bishop reach all 64 squares. The revised crossing continues the diagonal and preserves
  colour, and re-running the same exhaustive enumeration found **no mate under any of the
  64 rulesets**. The lesson is not that the measurement was sloppy — it was exhaustive and
  correct about the rule of the time. **Record the rule a measurement was taken under,
  next to the number**, and keep enumerations as runnable tests: re-measuring this cost one
  `npm run test` (`src/game/draw-rules.test.ts`).
- **Notation.** SAN cannot express a portal move; the spec adopts a tag (`Bb3–h5*`,
  spec §8.5) but nothing implements it. The format survived the crossing revision
  untouched, because it marks *that* a ray crossed rather than naming the geometry.
- **Unrelated component debt.** `SavedGamesList.spec.ts` fails the test-naming
  validator and, with the Ionic input/button specs, accounts for the failing
  integration tests. None of it touches `src/game/*`.
- **E2E flakiness.** `npm run e2e` intermittently times out on `page.goto` against
  the preview server. It is much worse at the default worker count, but happens
  occasionally even at `--workers=1`; an affected test always passes when re-run on
  its own (`prj-mgmt/epics/rules/task-e2e-parallelism.md`).

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for PR conventions and
[CLAUDE.md](./CLAUDE.md) for the coding standards and the research → plan →
implement → QA → review → commit workflow.
