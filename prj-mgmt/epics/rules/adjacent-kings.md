# Story — A piece attacks where it can move (the king forced the question)

> **Status: DONE (2026-09-23).** The rule is in the spec (§2.1, and §12's banner), in the
> code (`isStandardRuleSet`, `standardRuleSetTokens`, `RuleSetDefinition.standard`) and in
> the tests — 22 new unit tests including the invariant as a property test, plus
> [11 e2e tests](./adjacent-kings.e2e.ts). **Move generation was not touched**; see §7.
>
> Opened the same day as a narrower question — *what should happen when two kings stand
> adjacent across the seam?* — and answered by a wider principle, so the title changed
> with it. The earlier draft proposed writing the adjacency **into** the spec as intended
> behaviour; the owner's principle removed the case instead.

## Summary

As the owner, I want every piece to attack exactly the squares it can move to, so that the
seam expands where pieces go without changing what chess says about them — and so a king
can never cross into a square the enemy controls.

## 1. The rule

> **§2.1 — the movement space expands; the rules stay the same.**

| Piece | Portal right |
| --- | --- |
| Bishop, Rook, Queen, Knight, **King** | **one** — it crosses (moving *and* attacking), or it does not |
| Pawn | **capture only** — a push has no file component, so it can never cross (§12.4) |

Six flags → **64 rulesets**, all six off being ordinary chess.

## 2. Why the king forced it

Spec §12 (2026-08-03) made each piece's two rights independent. For the king that produced
a mode with no chess analogue, measured on 2026-09-22
([`../balance/readiness-probe.md`](../balance/readiness-probe.md) §3):

| King's rights | `a1` attacked by a black king on `h1` | White `Kb1 → a1` |
| --- | --- | --- |
| quiet + capture | yes | illegal (moving into check) |
| **quiet only** | **no** | **legal — the kings end up adjacent** |

§12.4 defended this as "coherent and symmetric". It is both, and it is still wrong: **a
king that can step to a square controls that square.** A king crossing without attacking
breaks the oldest rule in the game — a king may not move into check — and it breaks it
invisibly, because the square looks safe to the move generator.

The same objection generalises. A bishop with quiet-on/capture-off can slide to squares it
does not attack; a player reading the board sees a piece "covering" a square it cannot
strike. §12.3's "purely positional" mode is exactly the case
[`../board-interactions/portal-modes-ux.md`](../board-interactions/portal-modes-ux.md) was
raised to render — the UX problem was the rule's warning sign.

## 3. What changes in the code

**Not the token format.** ADR 0004 makes token positions append-only, and a token's
meaning must never change; all eleven slots keep parsing and keep meaning what they meant.
What changes is which rulesets are **standard**:

- `isStandardRuleSet(rules)` — true when every non-pawn piece's two rights agree. The rules
  picker, the study and the defaults use only these.
- Non-standard rulesets stay constructible and stay playable, marked **experimental**, so
  §12's modes remain available to a future study without a second rules engine.
- `ruleSetOf(kinds)` — already the "crosses both ways" constructor — becomes the primary
  way rulesets are built, and the 64 standard tokens are enumerable from it.

## 4. Acceptance Criteria

- [x] `isStandardRuleSet` exists, is documented, and a unit test enumerates **exactly 64**
      standard rulesets.
- [x] A king may never move to a square seam-adjacent to the enemy king **in any standard
      ruleset**; a unit test pins it from both sides of the seam.
- [x] A king may not cross into any square the enemy controls **through** the seam — a
      bishop, rook or queen attacking across it forbids the crossing. Tested per piece,
      since this is the rule the whole change exists to protect.
- [x] Attack and move sets agree for every non-pawn piece under a standard ruleset: a
      property test over random positions asserting `attacks(p) == moveTargets(p)`,
      pawns excluded. **This is the invariant the spec now guarantees, so it is tested as
      an invariant, not as examples.**
- [x] The pawn keeps capture-only, and the test says why in its name.
- [x] Non-standard rulesets still parse, still play, and are reported as experimental
      rather than rejected — no saved game or shared link breaks.
- [x] Perft is unchanged for all-off (published chess counts) and for the standard
      all-on token. ~~`PERFT_DEEP=1` after the change, since move generation is touched.~~
      **Amended: move generation was never touched** — see §7. Run anyway, and unchanged.
- [x] E2E coverage: eleven tests in [`adjacent-kings.e2e.ts`](./adjacent-kings.e2e.ts),
      one per rule, proving a *player* cannot do what the rule forbids.

## 5. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/rules.test.ts` | `isStandardRuleSet`; exactly 64 standard rulesets; non-standard still parses |
| Unit | `src/game/legality.test.ts` | king may not cross beside the enemy king, or into a square attacked through the seam |
| Unit | `src/game/attacks.test.ts` | the move/attack invariant as a property test, pawns excluded |
| Unit | `src/game/perft.test.ts` | counts unchanged for all-off and standard all-on |

## 6. What this costs, recorded honestly

The four modes were a genuinely novel variant axis, and retiring them shrinks the study
from 2,048 cells to 64. That is a **loss of scope and a gain of everything else**: the
space is now small enough that the owner can play a meaningful fraction of it, the study
needs no fractional design, and the rules stay explicable in one sentence — which
[`../balance/variant-study.md`](./../balance/variant-study.md) §3 already ranked as a
selection criterion ("between two similar candidates, prefer the one whose rules are
easier to teach").

The modes are not deleted. They remain in §12 and remain constructible, behind
`isStandardRuleSet`, if a later study wants them.

## 7. What we learned (2026-09-23)

**The engine already obeyed the rule. Nothing in move generation changed.** The plan
assumed a rules change meant a generator change; it did not. Under any ruleset where a
piece's two rights agree, "attack follows capture" and "a king may not move into check"
already produce exactly the required behaviour — the king cannot step beside an enemy king
across the seam, and cannot cross into a square a bishop guards from the far corner. What
was missing was not enforcement but **classification**: a name for which rulesets are the
game, and a flag the UI and the study can read. The whole change is therefore additive —
`isStandardRuleSet`, `standardRuleSetTokens`, `RuleSetDefinition.standard` — and perft is
untouched because the generator is.

That is worth remembering when the next rule is written down: **check whether the code
already does it before planning a change to it.** The measurement on 2026-09-22 found a
*ruleset* that was wrong, not an implementation that was.

**Four of the eleven e2e tests passed for no reason at first.** The fixtures were two lone
kings, which is insufficient material — the game was already drawn, so the board rendered
no hints at all, and every "this square is not offered" assertion passed vacuously. A pawn
each fixed it. The repo already warns that a *red* test is usually a bad fixture
(CLAUDE.md §8); this is the inverse and the more dangerous one, because nothing draws your
attention to a test that passes.

**Two small traps, recorded so the next person skips them:**

- An eager module-level constant that mints tokens reads `SCHEMA_PREFIX` in its temporal
  dead zone — `standardRuleSetTokens` memoises on first call instead.
- The Playwright browser binary had to be reinstalled (`npx playwright install chromium`)
  before the suite could run. Environment, not code, but it stops a run dead.

## Definition of done

The spec's invariant holds in the code, is enforced by a property test rather than
examples, and the 64 standard rulesets are the ones the product and the study offer.
