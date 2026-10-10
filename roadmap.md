# Mirror Chess Roadmap

Ionic + React + TypeScript + Vite + Vitest, with a pure, FP-leaning game core and a
rules-first delivery process. See [CLAUDE.md](./CLAUDE.md) for how work moves through
research → plan → implement → QA → review → commit.

## Local Development

```
npm i
npm run dev          # http://localhost:5173
npm run test         # unit (Vitest)
npm run test:int     # integration (Vitest + Testing Library)
npm run e2e -- --workers=1   # Playwright; see the parallelism task below
```

---

## Done

- **The mirror rule is specified.** `prj-mgmt/epics/rules/mirror-portal-spec.md` is
  the single source of truth: the `a`- and `h`-files are portals linked at equal rank,
  and sliders step through an empty edge square and keep sliding on the far side (§4).
  Steppers were added later in §11 — see below.
- **The engine is derived from the spec.** `src/game/moves.ts` was re-derived from
  §4; the five contradictory notions of "mirror" (same-rank K/R/Q mirror, horizontal
  wrap, diagonal wrap, knight adjacent-rank capture, pawn projection) are gone. The
  spec's §5 worked examples run as unit tests, and the `prj-mgmt` stories that
  contradicted it are reconciled or marked superseded.
  → `prj-mgmt/epics/rules/reconcile-core-to-spec.md`
- **The legality layer is in.** Spec §10 defines attacked squares, check, legal
  moves and terminal states; the engine implements them. Portal rays attack, so a
  bishop gives check *through* the seam, and there are checkmates that exist only
  because of the portal. Self-check filtering yields pins and check-resolution for
  free. The footer announces check / checkmate / stalemate as a live region.
  → `prj-mgmt/epics/rules/legality-layer.md`
- **Check is legible, and portal moves look different.** Portal destinations render
  as hollow rings against filled dots for ordinary moves; the checked king, the piece
  giving check and the squares the check travels through are all marked — including
  the seam crossing, so a check arriving from the far side of the board can be traced.
  Every cue has an `aria-label` counterpart, so nothing is colour-only. Picking a
  square king safety forbids now explains why instead of doing nothing.
  → `prj-mgmt/epics/game-logic/king/check-highlighting.md`
- **Every piece crosses the seam.** Spec §11: knights, kings and pawns cross by
  *wrapping the file* of their landing square, keeping the rank their own move
  dictates — a knight on `a3` reaches `h5, g4, g2, h1`; a king on `a3` reaches
  `h4, h3, h2`; a pawn's capture diagonals wrap while its push does not. Two visible
  consequences: edge pawns are no longer weak, and **kings can no longer be cornered
  against the edge file**, which dissolved three of our mating positions.
  → `prj-mgmt/epics/rules/stepper-portal.md`
- **Games end.** Draws by threefold repetition, the fifty-move rule and insufficient
  material, each announced by name; a drawn game stops accepting moves. `GameState`
  carries the halfmove clock and the positions since the last irreversible move, and
  movegen was narrowed to `Position` so search and perft pay nothing for it. A
  `maxPlies` backstop reports `move-limit` as its own outcome — never as a draw — so
  self-play cannot hang and cannot miscount giving up as a result.
  **The insufficient-material rule had to be re-derived, not inherited:** enumerating
  every placement under every relevant flag setting proved that a bishop able to capture
  across the seam **mates a lone king on its own** (`Ka1, Bd4` vs `Kh8`). King-and-minor
  is therefore not automatically a draw here.
  → `prj-mgmt/epics/rules/draw-rules.md`
- **Per-piece rule flags, with a ruleset token.** Each piece's portal is two independent
  rights — move across, capture across — compiled into a token like `2:bBrRqQ-----`, and
  resolved through a registry. Ordinary chess is a configuration, which is what lets the
  move generator be checked against published perft counts.
  → `prj-mgmt/epics/balance/rule-flags.md`
- **The rules are complete: promotion, castling and en passant.** A full game can now be
  played and scored correctly. Promotion was not cosmetic — a pawn reaching the far rank
  used to freeze there, which silently turned saved positions into losses.
  Two of the three are untouched by the seam; **en passant is not**, and can happen
  between pawns seven files apart (`a5` takes a pawn that played `h7–h5`). Castling needed
  no new rule, but a bishop can now forbid it from the opposite corner of the board.
  → `prj-mgmt/epics/rules/special-moves.md`
- **Verified against the outside world.** With every flag off, Mirror Chess *is* chess, and
  the special moves were the last thing standing between us and the **published perft
  suite**. Start-position depth 5 (4,865,609 — the first depth containing en passant),
  Kiwipete depth 4 (4,085,603), and Positions 3–5 all match. A FEN parser
  (`src/game/fen.ts`) was needed to read them, and is what a bug report should carry.
  This is the rigour the project set out to have and never had.
- **There is an engine, and you can play it.** `src/engine/*`: negamax with alpha-beta,
  MVV-LVA move ordering, iterative deepening and quiescence, over a deliberately
  geometry-free evaluation. It runs on a **Web Worker**, so the page never blocks; three
  difficulty levels differ only in how long it thinks, never in playing badly on purpose.
  Every optimisation is proved against an unoptimised twin — `alpha-beta ≡ negamax` on
  score *and* chosen move, with ordering on and off.
  It finds the **king-and-bishop mate that only exists because of the seam**, and wins a
  rook with a two-move back-rank tactic on its gentlest setting.
  → `prj-mgmt/epics/engine/architecture.md`, `engine-core.md`,
  `prj-mgmt/epics/opponent/opponent-integration.md`
  → **[A guided tour of the engine](./docs/engine/README.md)** — how a chess engine works,
  with this one as the text, each section ending in *what the mirror seam changes here*.
- **Two measurements that changed the design.** Quiescence turned out to be **80–94% of all
  nodes**, and the seam roughly **triples** the tree — the predicted qsearch explosion is
  real. And a mobility evaluation term cost **1465×** a material one (567 µs vs 0.4 µs),
  which *was* the entire search budget at ~1,000 nodes/second. Making evaluation
  material-only and generating forcing moves directly in quiescence made the engine
  **11–14× faster** with node counts essentially unchanged.

---

## Where this is heading

The default rules should be **chosen from evidence, not taste**. Each piece's portal
becomes a feature flag; an engine plays every combination against itself; the
combination with the best balance becomes the default.

That reframes everything below: the remaining rules work is no longer "finish chess",
it is **"make the game measurable"**. See the
[balance epic](./prj-mgmt/epics/balance/README.md) for the experiment design, and note
its two honest caveats up front — every variant already *has* a Nash equilibrium
(Zermelo), so the goal is choosing among variants by properties of their equilibrium;
and a study run before promotion exists would measure a different game. (The draw rules,
the other half of that caveat, now exist.)

The draw work also gave the study its first concrete prediction, and it points the
opposite way to the one already recorded: seam-crossing kings are hard to corner, which
should *raise* the draw rate, but a seam-crossing bishop is mating material on its own,
which should *lower* it. Both effects are real; the study is what says which dominates.

---

## Next up

Ordered by what unblocks the most. Items marked **[decision]** need the owner before
any code — do not guess (that is what broke the first build).

> **Re-ordered 2026-09-22 after measurement.** Five probes against the real engine moved
> the critical path — full write-up in
> [`prj-mgmt/epics/balance/readiness-probe.md`](./prj-mgmt/epics/balance/readiness-probe.md).
> The headline: **the engine scores every quiet move identically**, so it shuffles, and
> **18 of 18** self-play games ended in a repetition draw. The study's blocker is
> *evaluation*, not throughput — a faster engine would produce more of the same useless
> data — and it is a product problem too, since the opponent has no preference in a quiet
> position. Meanwhile the screening run turns out to be affordable today (~4.5 h on 20
> workers), so the performance project moves behind it with a derived target of 5–10×.
>
> The owner then set the priority, and it is **a chess engine worth playing**, validated by
> hand through the GUI before any study runs. The working order is:
>
> | | Work | Why here |
> | --- | --- | --- |
> | 1 | [Rules: a piece attacks where it moves](./prj-mgmt/epics/rules/adjacent-kings.md) | Small, and everything below is built on the rules being right |
> | 2 | [Evaluation that discriminates](./prj-mgmt/epics/engine/evaluation.md) | Measured blocker for the study *and* the opponent |
> | 3 | [Strength, and spending the time it is given](./prj-mgmt/epics/engine/strength-and-time.md) | The engine does not currently use its budget |
> | 4 | [Move log, in the new notation](./prj-mgmt/epics/board-interactions/history/move-log.md) | Games become recordable, shareable, replayable |
> | 5 | [Rules picker + engine panel](./prj-mgmt/epics/board-interactions/rules-picker.md) | **The owner's validation surface** — pick a permutation and judge the moves |
> | 6 | [Self-play harness](./prj-mgmt/epics/balance/self-play-harness.md) | Makes everything measurable; cheap now |
> | 7 | [Analysis project (Python)](./prj-mgmt/epics/balance/analysis-project.md) + Texel tuning | The statistics, and per-ruleset piece values |
> | 8 | [Lab view](./prj-mgmt/epics/balance/lab-view.md) | Many games from above, once there are games worth aggregating |
> | 9 | [Throughput, 5–10×](./prj-mgmt/epics/balance/search-engine.md) → [the study](./prj-mgmt/epics/balance/variant-study.md) | Needed for confirmation, not screening |
>
> **Added 2026-09-25 — the puzzle track**, which runs alongside all of this rather than
> behind it. A forced mate is a rules fact, proved by the perft-verified generator, so
> [puzzle mining](./prj-mgmt/epics/puzzles/README.md) needs nothing from the broken
> evaluation. The product is narrow and testable: **a puzzle that cannot exist in chess**,
> meaning its answer changes when the seam closes. Measured the same day — positions from
> random *play* are a bad source (~2% mates, none using the seam), while sparse endgame
> placements yield 1–11%, and for the bishop sets nearly every mate found is one chess
> cannot produce. The first set is mined and committed; the puzzle *screen* is not built.
>
> **Four decisions were taken that day.** The rule space is **64 rulesets**, because a
> piece attacks exactly where it can move (spec §2.1) — which retires §12's quiet/capture
> split as the default and closes the adjacent-kings case. **Notation is settled** (§8.5,
> the `*` seam tag), unblocking the move log and undo. Learning stops at **Texel-tuned
> linear weights**, with neural evaluation deferred behind an explicit trigger. And the
> **Python analysis project** is approved, on the condition that it never implements a rule.

> **Added 2026-10-10 — the interface is now the weak point.** The owner played on a phone
> and reported that the functionality is good and the *presentation* is not: the board
> jumps between moves, controls fall below the fold, and a laptop shows a small board in a
> large empty window. Three items, and they are ahead of the engine work for anyone whose
> next session is a short one, because they are small, visible and independent of the
> evaluation:
>
> | | Work | Why |
> | --- | --- | --- |
> | A | [Layout shift](./prj-mgmt/epics/quality/layout-shift.md) | 🐞 A bug, with screenshots. Conditional text above the board moves it several times a second |
> | B | [Responsive + a11y pass](./prj-mgmt/epics/quality/responsive-design-pass.md) | The same surfaces, done properly, across phone / laptop / desktop |
> | C | [Step through history](./prj-mgmt/epics/board-interactions/history/step-through-history.md) | Review earlier positions and return to the present — needs a move history, which `undo-move.md` and `move-log.md` also want |

**The rules are done.** A complete game can be played and scored correctly, so nothing
here is on the critical path to *playing*. The main line is now **the engine**, in the
section below; these two are the small things it will eventually want.

The ground under the engine is firm in a way it has never been: `Move` has its final shape
(`prj-mgmt/epics/engine/task-move-shape.md` is closed), the three generation contracts are
separated (`Position` / `MovePosition` / `GameState`), and correctness is pinned to
published perft rather than to our own opinion.

1. **[decision] Notation.** SAN cannot express a portal move, and now has more to say than
   before: a castle, a promotion piece, an en-passant capture *and* a seam crossing, plus
   check/mate suffixes. Spec §8.5 proposes a tag (`Bb3–h4*`). Needed before any move log,
   PGN export, or network protocol — but it no longer blocks the engine.
2. **Move log + undo.** `prj-mgmt/epics/board-interactions/history/undo-move.md`.
   The draw rules added *position* history, which is a different thing: undo and a move
   log need the **move sequence**, and nothing records it yet. Needs (1).

---

## The AI opponent

Full detail in the [opponent epic](./prj-mgmt/epics/opponent/README.md), which starts
from two measurements taken on the real engine.

**Speed is not the blocker.** The current generator does ~250k positions/second —
slow for a chess engine, but ample for a one-second move at depth ~6. The opponent can
be built on today's code; the performance project is only needed for the study.

**Evaluation is the blocker**, and not merely "the numbers need tuning". The seam
invalidates the geometric assumptions every chess engine is built on: a knight attacks
8 squares from `a4`, exactly as many as from `d4`, so piece-square tables are largely
meaningless; every seam hop flips square colour, so **bishops are not colour-bound** (a
lone bishop reaches all 64 squares) and the bishop pair is close to worthless; and each
rank is a *cycle*, so a rook attacks along it both ways and a king's rank cannot be
walled off with one blocker.

**The engine is also a teaching artifact** — a first-class goal, not documentation added
afterwards (CLAUDE.md §12). Chess engines are notoriously unreadable; this one aims to
be the exception, and the feature-flagged rules make it a genuinely novel one, since a
reader can switch a rule off and watch the consequences propagate. See the
[engine epic](./prj-mgmt/epics/engine/README.md).

~~3. Engine architecture~~, ~~4. Engine core (steps 1, 2, 6, 9)~~ and
~~6. Playing against it~~ are **done** — see the Done list above. What remains of the
engine, in order of what it buys:

3. **A faster board.** → `prj-mgmt/epics/balance/search-engine.md`
   **Promoted, and now the engine's own bottleneck rather than only the study's.** A node
   costs ~300 µs because the reference generator copies the board and re-scans for attacks
   on every legality test, so the engine reaches depth 4 in a second and depth 6 in
   minutes. Make/unmake, attack-from-square lookups and typed arrays are the
   order-of-magnitude fix; a transposition table would shave the node *count* but not this.
   The current generator stays as the differential-perft oracle.
4. **The rest of engine-core.** → `prj-mgmt/epics/engine/engine-core.md`
   Whitelist steps 3 (killers + history), 4 (transposition table — with the
   ruleset-salting trap), 5 (seam-aware SEE, for ordering only) and 8 (PVS). All on the
   safe list, so each must keep `alpha-beta ≡ negamax` passing.
5. **Evaluation.** → `prj-mgmt/epics/engine/evaluation.md`
   The hard part, and now the one with evidence attached: mobility is off because it costs
   1465× material, and every piece value is inherited from chess and flagged as suspect.
   *Derive* them from self-play rather than asserting them, and test each inherited chess
   assumption as a hypothesis.
6. **Difficulty verified by a match.** The three levels differ only in search depth, which
   is the right design, but "each level beats the one below it" is asserted rather than
   measured. Needs the self-play harness below.

---

## The variant study

Full detail in the [balance epic](./prj-mgmt/epics/balance/README.md). Consumes the
engine above.

7. **Throughput.** → `prj-mgmt/epics/balance/search-engine.md`
   64 rulesets × ~1,000 games is weeks at current speed. Make/unmake instead of
   copying, attack-from-square lookups, typed arrays — with the existing generator kept
   as the oracle the fast path is differentially perft-tested against.
8. **Self-play harness.** → `prj-mgmt/epics/balance/self-play-harness.md`
    Seeded, resumable, parallel; metrics with confidence intervals. Both players always
    share one ruleset, so variants are compared on metrics, never head-to-head.
9. **The study.** → `prj-mgmt/epics/balance/variant-study.md`
    A `2^6` full factorial over the six flags — 64 rulesets — reporting each piece's
    *main effect* on balance rather than a leaderboard. Calibrated first against
    all-flags-off, which is ordinary chess and whose balance is already known: if the
    control looks wrong, the harness is wrong.

---

## Then

- **[decision] Engine path.** Keep the TS core, or move the authority to a native
  (Rust / WASM) engine? The variant study gives this decision a concrete forcing
  function: 64 rulesets × ~1,000 games is exactly the workload that will show whether
  TS is fast enough. Decide from that benchmark rather than in the abstract. Whatever
  is chosen must pass the same test battery. CLAUDE.md §6.
- **Opening book.** None exists for this variant, so early play will be unprincipled.
  Acceptable for a casual opponent, and arguably interesting — but it is what will make
  the engine feel weakest first.
- **Player-proposed rules.** The rule-flag work is the first step toward the north-star
  goal of players proposing variants: once a ruleset is data, a proposed variant is a
  configuration that can be measured the same way.
- **Network contract.** `GameState` in ↔ legal `Move[]` / applied `GameState` out, so
  the front end and the engine can evolve independently.
- **[decision] Product scaffolding order** — Capacitor (Android/iOS), Google auth,
  score tracking, and player-proposed rules. Currently web-first; the open question
  is when to introduce mobile packaging relative to the rules work.

---

## Housekeeping

- **E2E reliability** — `npm run e2e` times out on `page.goto` against the preview
  server. `--workers=2` was the workaround; as of the draw-rules suite it is no longer
  enough (2 of 41 failed there, both passing on their own), and **`--workers=1` passes
  the whole suite**. An affected test always passes when re-run in isolation.
  → `prj-mgmt/epics/rules/task-e2e-parallelism.md`
- **Component debt** — `SavedGamesList.spec.ts` fails the test-naming validator, and
  it plus the Ionic input/button specs are the failing integration tests. None of it
  touches `src/game/*`.
- **Graphics** — capture hints are colour-differentiated already; replacing hint
  markers with distinct SVG remains open, and should land together with notation (2).
- **The enumeration is slow** — the insufficient-material proof in
  `src/game/draw-rules.test.ts` is ~24 s of the unit suite. Worth it; if the suite needs to
  get fast, cache the proof rather than delete it.
- **ESLint has never run in this repo** — a legacy `.eslintrc.cjs` against ESLint 9's flat
  config, and no `lint` script. Three bespoke checkers (`check:layers`, `check:naming`,
  `check:docs`) cover the most important parts, and two of them are re-implementing a
  linter badly. → `prj-mgmt/epics/rules/task-lint-does-not-run.md`
