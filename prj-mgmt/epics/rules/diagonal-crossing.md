# Bug / spec change — a diagonal must continue as a diagonal

> **Status: DONE (2026-10-03) — M0–M5 all complete.** Spec, code, enumerations, puzzles,
> tests and docs migrated in one sitting; §9 lists what still has to be folded into
> CLAUDE.md, and every milestone below carries what it measured.
> Reported by the owner 2026-10-03 after playing on a phone; measured and decided the same
> day. Every number in §2 is from the running code; §5's wording is now in the spec.
>
> **M0 decision (owner, 2026-10-03):** *"The analysis of the shift in rules and all of the
> specs that reference is 100% accurate — we should start acting on this now."* The crossing
> continues the diagonal. §4 of the spec is revised; the code is now the thing that disagrees
> with the spec, and §6 below tracks the migration milestone by milestone.

## 1. What the owner reported

> "If there was a mirror and there was a board, the rules would allow the bishop or queen to
> continue on the diagonal, so they would pop out on the other side **one square up** and
> **stay on the same colour** — rather than pop out on the same row just across the seam."

## 2. What the code does, measured

A bishop on `b3` (a **light** square), all flags on:

| | Destinations across the seam | Colour |
| --- | --- | --- |
| **Today** (spec §4) | `h4, g5, f6, e7, d8` and `h2, g1` | **all 7 are dark — every crossing flips colour** |
| **Owner's rule** | `h5, g6, f7, e8` and `h1` | all light — colour preserved |

A **rook** is unaffected: `Ra4` reaches `h4, g4, f4, e4, d4` under either rule, because a
horizontal ray has no rank component to advance. **The bug is diagonal-only**, exactly as
reported.

The owner's rule is internally consistent in a way the current one is not: a ray that truly
*continues* cannot change square colour, because each step changes file and rank by one and
parity is preserved. The current rule's hop changes file by seven and rank by zero, which
flips parity every time.

## 3. Why this is a reversal, not a slip — read before deciding

The current behaviour is not an accident. The spec states it four times, calls the
alternative wrong by name, and attributes the example to the owner:

- §3: "The portal maps `(0, r) ↔ (7, r)` — **same rank**."
- §4: "Compute the mirror edge `M = (7 - edge.f, edge.r)` — **horizontal hop, same rank**."
- §4 trap note: "A bishop leaving `a4` emerges at `h4` (same rank)… **Advancing the rank on
  the hop (a cylinder wrap) is wrong and yields `h5` instead of `h4`.**"
- §5.1, labelled **"owner's headline example"**: "via `a4` → `h4, g5, f6, e7, d8`…
  Headline check: the two portal mouths are **`h4` and `h2`** ✓ — Verified by hand."

So the repo believes this rule was checked by the owner and confirmed. It may be that the
written example was wrong from the start, or that the intent changed. **Either is fine — but
it needs to be said out loud**, because CLAUDE.md §0 exists precisely because this project
once had several notions of "mirror" at the same time.

## 4. What else reverses — the expensive part

The rank-preserving hop is load-bearing for several of the project's headline findings.
Under the new rule a bishop is **colour-bound again**, and these become false:

| Recorded as true | Under the new rule |
| --- | --- |
| "Every seam hop flips square colour" | **False** — a continuing diagonal preserves it |
| "A lone bishop reaches all 64 squares; the pair is near worthless" | **False** — bishops are colour-bound as in chess |
| "A bishop that captures across the seam mates a lone king alone" | **Almost certainly false.** Mate needs the king attacked, and a colour-bound bishop can never attack half the board. Must be re-enumerated, not assumed |
| "The board is not a cylinder — only steppers wrap" | **It becomes one.** Sliders and steppers would use the same crossing |
| Insufficient material (`draw-rules.ts`) | K+B vs K likely returns to a draw — the rule is derived from the mate enumeration above |

That last pair is the real cost: the **marquee puzzle set** ("a lone bishop mates, which
chess cannot do") may cease to exist, and `draw-rules.ts` encodes the old answer.

**The compensation is a genuine simplification.** §11 already says steppers cross by
*wrapping the file and keeping the rank their move dictates*. The owner's rule is the same
sentence applied to sliders. Two crossings collapse into one, and §4's warning that "§4 and
§11 are two different crossings" stops being needed. A rule that is one sentence instead of
two, and that preserves colour, is easier to teach — which spec §2.1 already treats as a
design goal.

## 5. Draft spec wording, for sign-off

> **§4 (revised).** For each of a slider's directions `(df, dr)`, walk the ray. When a step
> would leave the board across the **a- or h-file**, the file **wraps** (`a` ↔ `h`) and the
> rank advances exactly as `(df, dr)` dictates; the ray then continues from that square.
> This is the same crossing the steppers use (§11): the file wraps, the rank does what the
> move already said it would.
>
> A bishop on `b3` therefore reaches `a4` and continues `h5, g6, f7, e8`. **A crossing never
> changes a piece's square colour**, so bishops remain colour-bound, exactly as in chess —
> the seam expands where a piece can travel, not what it is (§2.1).
>
> A rook's horizontal ray is unchanged by this: with `dr = 0` the rank does not advance, so
> `a4` still reaches `h4, g4, …`.

## 6. Milestones

Sequenced so the repo is never in a state where it believes two things at once. **Each
milestone ends green** — that is the point of splitting them.

### M0 — Decide *(blocks everything)*
Owner confirms §5's wording. Nothing else starts until then: implementing a rule the spec
contradicts is the exact failure CLAUDE.md §0 was written to prevent.

### M1 — Spec first, code second ✅ DONE 2026-10-03
Rewritten in [`mirror-portal-spec.md`](./mirror-portal-spec.md): the banner, §1, §2's table
and note, §3, §4 (rule + pseudocode), §5.1–5.4, §6, §7, §8.6, §8.5's examples, §10.1, §10.4,
§11.1, §11.5 and §12.1/§12.6. Every replaced passage is struck through in place with a dated
`Superseded` note, never deleted. **Gate met:** `check:docs` green; both §4 findings of this
document carry **[to be re-measured — M3]** in spec §10.4.

**Three findings M1 produced** — none of them was in the plan:

1. **"A crossing never changes square colour" is false as written.** It holds for a diagonal
   (file `±7`, rank `±1` — parity preserved) and fails for a **rook's rank crossing** (file
   `±7`, rank `0` — parity flips). Harmless in play, because a rook is not colour-bound, but
   a property test written from §5's original wording would fail and leave the next person
   unsure which statement was wrong. The spec states the invariant one level deeper instead:
   **a wrapping step changes `(f + r) mod 2` exactly as the same step would on an unbounded
   board**, since `±7 ≡ ±1 (mod 2)`. Bishops are colour-bound and knights still alternate,
   both as corollaries. §5's draft wording above is left as the owner wrote it.
2. **The seam adds fewer squares than it used to, not more.** A bishop on `b3` gains **four**
   destinations from the seam under the new rule (`h5, g6, e8, h1`) where it gained seven
   under the old one — 13 destinations in total against 16. A ray is now **≤ 7 squares, the
   chess bound**, where the old rule allowed 15. So the revision makes bishops *less* mobile
   **and** colour-bound: the piece values and the mobility weight in `evaluate` have to be
   re-derived against the new geometry, not nudged. Add to
   [`../engine/evaluation.md`](../engine/evaluation.md).
3. **The right rule was already written, and we deleted it** → spec §9.1. The pre-reboot
   `diagonalPortalWrap` (`git show 04aa980:src/game/moves.ts`, 2025-08-09) emitted exactly
   `h5, g6, f7, e8` and `h1` for a bishop on `b3`. It was one of the "five contradictory
   notions of mirror" the reboot deleted — and it was the owner's intent. The reboot's
   premise was right; its method lost information, because *contradictory* was treated as
   *all wrong*. See §9 for what goes into CLAUDE.md.

### M2 — Implement, with the external oracle holding ✅ DONE 2026-10-03
**It was one function.** `rays.ts` gained `walkRay` — an ordinary chess ray walked on a
board whose files wrap — and `moves.ts` and `attacks.ts` each lost their *second* walk.
Deleted outright: `portalMouth`, `approachToMouth`, `collectRay`, the "edge square must be
empty" precondition, and the 15-square bound. `checkPath` no longer stitches two halves
around a portal mouth, because one walk is the whole journey.

> **The correct rule is strictly less machinery than the wrong one.** Worth remembering as a
> smell: the old rule kept needing extra clauses to stay coherent (a precondition, a second
> ray, a cap, and a standing instruction not to generalise §4 to §11).

**Gates, all met:**

- **All-off perft unchanged.** `perft(5) = 4 865 609`, and with `PERFT_DEEP=1`, Kiwipete
  depth 4 `= 4 085 603`, Position 4 `= 422 333`, Position 5 `= 2 103 487`. The only
  externally verified numbers in this project did not move.
- **Mirror baselines re-measured and recorded** in `perft.test.ts`:

  | ruleset | before | after |
  | --- | --- | --- |
  | sliders only | 20, 400, 9 690, 230 114 | 20, 392, 9 000, 203 214 |
  | all on | 20, 400, 9 852, 238 060 | 20, 392, 9 162, 211 036 |

- **Depth 2 falls *below* chess's 400, and that is correct.** Four White pawn moves open a
  wrapped diagonal that **pins a Black pawn to its king on move two**: after `1.c3` the
  queen on `d1` runs `c2, b3, a4 | h5, g6, f7`, and after `1.g3` the bishop on `f1` runs
  `g2, h3 | a4, b5, c6, d7`. Four moves × two lost replies = the eight. The seam does not
  only add moves; through a pin it takes them away, in a way chess cannot. Pinned as a
  behavioural test, not just a node count.
- **The parity invariant**, as three property tests over all 64 origins: a bishop's
  destinations are all its own colour, a knight always changes colour, and — stated
  explicitly so nobody "tidies" it — a **rook's** rank crossing *does* change colour.
  See §6's finding 1.
- **Broken on purpose, once.** Re-introducing the rank-preserving hop in `walkRay` failed
  exactly 11 of the 37 oracle tests, including the colour-bound invariant and the 7-square
  bound, while the rook, knight and all-flags-off tests correctly still passed. A minute's
  work for the difference between "it passes" and "it can fail".

### M3 — Re-measure what reverses
Re-run the enumerations rather than reasoning about them. Every row is a claim this repo
currently records as **true and measured**, and each is now in doubt:

| Claim on record | Where | How to settle it |
| --- | --- | --- |
| A lone bishop mates a bare king | spec §10.4, `draw-rules.md`, CLAUDE.md §0, a memory | exhaustive mate enumeration |
| A seam hop flips square colour, so the bishop pair is near worthless | CLAUDE.md §0, `readiness-probe.md` §4 | **already settled by M1** — false; §7's parity invariant |
| `K+B vs K+B` on one colour is not a closed material class | spec §10.4 → `draw-rules.ts` | colour-reachability flood fill |
| A **bishop** forbids castling from the opposite corner | CLAUDE.md §0 | attacked-squares probe. A bishop on `a1` now attacks `h2, g3, …`, **not** `h1–e1`, so this is expected to become **rook-only**. The §13.3 text is already rook-based and needs no change |
| A knight on `a4` attacks as many squares as one on `d4` | CLAUDE.md §0, `evaluation.md` | unaffected — knights are steppers |
| The board is not a cylinder; only steppers wrap | `readiness-probe.md` | **it is one now**, for files. Re-run the rotation-symmetry probe |
| Piece values and the mobility weight | `evaluation.md` | a bishop loses mobility *and* becomes colour-bound (§M1 finding 2) — re-derive, do not nudge |

Update `draw-rules.ts` if and only if the enumeration says so. **Gate:** CLAUDE.md §0's
table, the affected memories, `readiness-probe.md` §4 and `evaluation.md` corrected with the
new measurements, each citing the probe that produced it.

#### ✅ DONE 2026-10-03 — what the re-measurement said

| Claim | Answer | Where it landed |
| --- | --- | --- |
| A lone bishop mates | **No mate**, over every placement and all 16 bishop/king flag settings | `draw-rules.ts` now reads **no rule flags**: insufficient material is chess's rule exactly |
| `K+B vs K+B` on one colour | **No mate** — a closed class again | same |
| A seam hop flips square colour | **False** | spec §7, three property tests |
| A bishop forbids castling from the opposite corner | **True, and the square moved** — `Ba3` covers `g1`, not `f1` | `special-moves.test.ts`, `special-moves.e2e.ts` |
| The board is not a cylinder | **It is one now** — with every flag on, file-rotation symmetry **holds for all material, k = 1..7** | `readiness-probe.md` §4 |
| Bishop mobility | **13** destinations from `b3` against 16 under the old rule; **nothing at all** gained on `d4` | `eval.ts`, `evaluation.md` |

Two of those deserve calling out:

- **The castling claim was expected to die and did not.** It was listed above as *"expected
  to become rook-only"*, and a `Ba3` still forbids kingside castling — by attacking `g1`
  instead of `f1`. The milestone says *enumerate, do not reason*, and this is the row that
  proves why: the reasoning was sound and the answer was wrong.
- **The cylinder answer is the valuable one.** Rotation symmetry over the whole move
  generator means **8×** reduction for a tablebase or a learned evaluation under the all-on
  ruleset, and it makes any file-dependent piece-square term *provably* wrong there — a hard
  constraint on `../engine/evaluation.md` rather than a hypothesis. It also quietly settles
  a `[decision]` that `readiness-probe.md` §4 had flagged for later ("should the slider
  crossing be cylindrical?"), from the other direction entirely.

### M4 — Puzzle triage
**Do not filter by inspection.** All 285 puzzles contain a bishop or a queen, so any mate
net may rest on a diagonal seam attack even when the key move does not cross — of the 67
seam solutions, 63 are diagonal, but the other 222 puzzles are not therefore safe.

The sound filter is the one we already have: **re-run the solver over the committed set
under the new rules and keep what still proves out.** `puzzle-set.test.ts` already does
exactly this check; it becomes the triage tool. Survivors keep their ids; the rest are
removed and replaced by a fresh mine. **Gate:** every shipped puzzle re-proved, and the set
reports how many survived.

#### ✅ DONE 2026-10-03 — and it was worse than the inspection would have guessed

**16 of 285 survive.** The sound filter was worth insisting on: the heuristic would have
suspected the 67 puzzles whose *key move* crosses the seam, and the real answer is that
**139 lost their forced mate entirely** — most of them puzzles whose solution never touched
the seam, but whose mate net rested on a diagonal seam attack somewhere.

| Rejected because | |
| --- | --- |
| no unique forced mate under the new rules | 139 |
| **the position was illegal** (Black already in check) | **119** |
| already over | 7 |
| a different unique solution | 4 |
| **survived** | **16** |

The shipped set is now **248 puzzles** = 232 freshly mined + 16 survivors, at
`puzzles/puzzles.v3.json`. 16 seam solutions, 50 with no mate in chess at all,
187 mate-in-2 / 61 mate-in-3.

**Three findings came out of the re-mine, none of them planned:**

1. **42% of every set this project has shipped was an illegal position.** The miner never
   asked whether the side *not* to move was in check, so two kings standing next to each
   other passed every criterion. 121 of 285 in the old set, 100 of 238 in the first
   re-mine. Found by reading one record closely enough to notice, not by a test — see
   [`../puzzles/mine-mate-in-2.md`](../puzzles/mine-mate-in-2.md) §2. Now a criterion in
   `evaluateCandidate` **and** an assertion on the shipped artifact in
   `puzzle-set.test.ts`, because a set can also arrive hand-edited.
2. **The material sets had to be re-chosen by measurement.** `K+B vs K` — the marquee
   shape, chosen because a lone bishop mated — is now **dead material**: 150 of 150
   placements are drawn before a solver runs. `K+B+B vs K+N`, previously the densest source
   at ~10%, yields **nothing**. The new list is led by `K+R+R vs K`, and the measurements
   are in the `DEFAULT_MATERIAL` doc comment.
3. **There are no seam *captures* left in the library** — 0 of 248. A colour-preserving ray
   through sparse endgame material rarely meets anything, so every seam solution is a quiet
   move. The "mirror capture" UI cue is now covered only by hand-built fixtures
   (`piece-capabilities.e2e.ts`), which is worth knowing before anyone deletes those.

Yield fell from roughly 1–3% of candidates to **1.4%**, and the set costs ~15 minutes of
mining rather than ~4.

### M5 — Tests and UI ✅ DONE 2026-10-03
~20 test files asserted on seam destinations. They were not collateral damage — each one is
a worked example of the rule, and updating them is how the new rule got checked. Several
fixtures had to be *replaced* rather than renumbered, because the position they described
stopped existing.

**Gate met:** 459 unit tests pass, the deep perft counts pass, 115 e2e pass, 26
accessibility checks pass, the build is clean, and the integration tier is at its
documented 13 pre-existing failures. Screenshots taken and **looked at** — a bishop on `b3`
shows exactly four hollow rings, on `h5, g6, e8, h1`, every one of them the same colour as
`b3`; the puzzle screen plays `Ba1–d6*` and prints the route `a1 → h2 → g3 → f4 → e5 → d6`.

**Three fixtures were wrong in ways only the engine could tell us**, which is the
milestone's own lesson repeating:

- A check fixture used `Kf7` against a bishop on `b3`, which reads perfectly and tests the
  wrong thing: `f7` is on that bishop's *ordinary* north-east diagonal, so the check never
  touches the seam and dedupe keeps the standard route. `Ke8` is the one that crosses.
- A "blocker removes the attack" fixture put a black king on `h5` behind a white pawn on
  `a4` — and that pawn attacks `h5` **through the seam**, so the position was check from
  the blocker.
- Two new e2e fixtures were a lone bishop against a lone king, which is now **insufficient
  material**: the game is drawn, no hints render, and an absence assertion passes for free.
  That is the trap CLAUDE.md already warns about, and the revision created fresh instances
  of it on the day.

One UI change came out of looking: the coordinate labels drawn inside the edge squares were
obscuring pieces on rank 1 — visible the moment a puzzle's key piece stood on `a1`. They now
recede behind the glyph (`prj-mgmt/epics/quality/mobile-layout.md` §6).

## 7. Risks

- **The biggest risk is a half-migration**, where the spec says one thing and a test still
  encodes the other. M1's "supersede, don't replace" rule and M2's perft gate exist for that.
- **Perft has no external oracle for mirror rulesets** — all-off chess is the only
  outside-verified number, and it does not move. Mirror counts can only be re-baselined, so
  they must be regenerated deliberately and recorded, never adjusted to match.
- **The `*` notation is unaffected**: a crossing is still a crossing.

## 8. Related

- Mobile clipping found in the same session → [`../quality/mobile-layout.md`](../quality/mobile-layout.md)
- The governing principle this rule serves → spec §2.1
- The right rule, deleted in the reboot → spec §9.1

## 9. What went into CLAUDE.md — ✅ DONE 2026-10-03

Held back deliberately until M3 so the operating manual was edited **once**, with numbers
rather than expectations. All five landed, four of them as a new §0 subsection *"The third
lesson: a measurement is only as durable as the rule it was taken under"* and its four
companions. The process lessons needed no measurement; they are kept listed here because
this document is where a reader comes to find out *why* those rules exist.

This pass also produced the **`consolidate-session` skill**
(`.claude/skills/consolidate-session/`), which is the routine that should have existed
before today: sweep a session for findings, route each to exactly one home, and leave the
next session a hand-off. Its closing section, *"Constitutional changes get more than this"*,
is this migration's shape generalised — decide explicitly, milestones that each end green,
re-measure everything the change puts in doubt, keep an external oracle fixed, supersede in
place.

1. **Correct §0's inherited-belief table** — the bishop rows reverse. Keep the table's
   shape: the entries were right about *the old rule*, and that is the point.
2. **"Contradictory is not all wrong."** When a reconciliation deletes competing
   implementations, **record what each one computed** before deleting it — a worked example
   per branch, in the story. Deleting `diagonalPortalWrap` was correct; deleting the evidence
   of what it computed cost fourteen months and a dig through git history (spec §9.1).
3. **A rule that needs a prohibition to stay coherent should probably collapse.** Spec §11.1
   said "do not generalize one rule to the other" and invented *transit is not a step* to
   justify a behaviour that already existed in code. The simpler rule it forbade was the
   right one. Treat "do not generalise this" in our own documents as a smell.
4. **An invariant should explain, not restate.** "No rank change on the hop" was precise,
   tested, passing — and it encoded the bug, because it was a transcription of the
   implementation. The replacement derives the behaviour from parity, which a reader can
   check without running anything (spec §7).
5. **What a spec calls intentional, a player calls a bug.** The divergence was documented as
   "intentional, not an inconsistency to 'fix'" and was found in an afternoon by someone who
   had never read the spec. When the spec and the board disagree in front of a user, the spec
   moves.
