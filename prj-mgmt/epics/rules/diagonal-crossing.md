# Bug / spec change — a diagonal must continue as a diagonal

> **Status: BLOCKED — needs an explicit owner decision, because it REVERSES a confirmed
> spec rule.** Reported by the owner 2026-10-03 after playing on a phone. Measured the same
> day; every number below is from the running code.

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

### M1 — Spec first, code second
Rewrite §3, §4, §5.1–5.4, §8.5's example and the §11 note, each marked as superseding the
old text rather than quietly replacing it. Add the colour-preservation invariant to §7.
**Gate:** `check:docs` green; every claim in §4 of this document annotated in the spec as
"to be re-measured".

### M2 — Implement, with the external oracle holding
One change in the ray walk (`rays.ts` / `moves.ts` / `attacks.ts`): the crossing advances
the rank. **Gates:**
- All-off perft **unchanged** — published chess counts are untouched by this, which is what
  makes the change safe to attempt at all.
- Mirror-ruleset perft counts re-baselined deliberately, with the old numbers kept in the
  commit message.
- The move/attack invariant property test still passes.
- New property test: **a crossing never changes square colour** — the invariant that makes
  this rule self-evidently right, and the cheapest guard against a regression.

### M3 — Re-measure what reverses
Re-run the enumerations rather than reasoning about them: K+B vs K, K+B+B vs K+N, the
colour-reachability flood fill, and the rotation-symmetry probe. Update `draw-rules.ts` if
and only if the enumeration says so. **Gate:** CLAUDE.md §0's table, the affected memories
and `readiness-probe.md` §4 corrected with the new measurements.

### M4 — Puzzle triage
**Do not filter by inspection.** All 285 puzzles contain a bishop or a queen, so any mate
net may rest on a diagonal seam attack even when the key move does not cross — of the 67
seam solutions, 63 are diagonal, but the other 222 puzzles are not therefore safe.

The sound filter is the one we already have: **re-run the solver over the committed set
under the new rules and keep what still proves out.** `puzzle-set.test.ts` already does
exactly this check; it becomes the triage tool. Survivors keep their ids; the rest are
removed and replaced by a fresh mine. **Gate:** every shipped puzzle re-proved, and the set
reports how many survived.

### M5 — Tests and UI
~20 test files assert on seam destinations (`mirror-portal`, `bishop`, `moves`, `legality`,
`attacks`, `special-moves`, `draw-rules`, the capability matrix and four e2e suites). They
are not collateral damage — each one is a worked example of the rule, and updating them is
how the new rule gets checked. **Gate:** full suite green, and the screenshots looked at.

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
