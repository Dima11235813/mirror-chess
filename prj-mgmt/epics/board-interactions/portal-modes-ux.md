# Story — Showing *how* a piece may cross the seam

> **Status: CLOSED as moot (2026-09-23) — the rule it existed to render was retired.**
> Spec §2.1 now requires a piece to attack exactly where it can move, so the four modes of
> §12 are not part of the standard game and **the dangerous case below cannot arise**:
> there is no square a piece may strike but never occupy, and none it may occupy while
> threatening nothing. A seam destination means what an ordinary destination means.
> → [`../rules/adjacent-kings.md`](../rules/adjacent-kings.md)
>
> **Read §"Why this is now a first-class problem" anyway — it was right, and it is why the
> rule changed.** This story identified, months before the king case was measured, that a
> mode where the danger squares are not the squares a piece can reach is expensive for
> humans and gives Ultima its reputation. That argument came back as the reason to retire
> the split rather than render it. A UX problem that cannot be designed away is sometimes
> a rules problem wearing a costume.
>
> Still live, and inherited by [`rules-picker.md`](./rules-picker.md): portal destinations
> must remain distinguishable from ordinary ones, by **shape and not colour alone**, with
> an `aria-label` counterpart. That part already ships.
>
> If §12's modes ever return as a study axis, reopen this — the analysis holds.

**Status: BACKLOG — needs an owner UX decision before implementation.**

> Raised by spec §12 (quiet and capture became separate rights) and independently by
> research: *"the UI must render the move set and the attack set as distinct, and
> non-visually as well. A move-only portal square that looks like a threat is a UX bug"*
> ([`../../research/variant-precedent.md`](../../research/variant-precedent.md)).

## Why this is now a first-class problem

Until §12, a portal square meant one thing: the piece can go there, and if an enemy is
there it can take it. One marker sufficed, and
[`../game-logic/king/check-highlighting.md`](../game-logic/king/check-highlighting.md)
delivered it — a hollow ring, distinguishable by shape rather than colour alone.

Now a piece may hold **either right independently**, so a seam square can mean four
different things, and two of them are genuinely dangerous to confuse:

| The piece may… | What the square means | Risk if shown wrong |
| --- | --- | --- |
| move and capture across | go there, take there | — |
| **move only** | go there — **but it threatens nothing** | Player reads a threat that does not exist; over-defends |
| **capture only** | it can strike here — **but cannot occupy** | Player reads a safe square; walks into a capture |
| neither | ordinary chess | — |

The **capture-only** case is the dangerous one. A square a piece attacks but can never
move to has no counterpart in ordinary chess *except pins* — and pins are exactly the
thing FIDE had to write a special rule for (Art. 3.1.3). Players will get this wrong
until the board tells them.

There is also a research warning about the *long-range* version of this: divergence is
easy for humans when both modes are short-range and adjacent (the pawn), and expensive
when a long-range mode diverges — *"the danger squares are not the squares the piece can
go to."* Ultima's reputation is "deep but hard to learn" for precisely this reason. Our
sliders cross at long range.

## The decision the owner needs to make

**How should the board distinguish "I can go there" from "I threaten there"?**

Some directions, none chosen:

1. **Two distinct markers** — the existing hollow ring for a reachable seam square, plus
   something else (a crosshair? a corner mark?) for a threatened-but-unreachable one.
   Cheap; risks marker soup once captures, en passant and check paths are all on screen.
2. **A threat overlay, toggled** — the board shows reachable squares by default and the
   attack set on demand (hover, a modifier key, a toggle). Keeps the default view calm;
   hides information that in this variant is genuinely non-obvious.
3. **Show the attack set for the *selected* piece, always** — reachable and threatened as
   two visually distinct layers simultaneously.
4. **Show the opponent's threats**, not just your own — arguably the real need, since
   capture-only pieces make danger squares unintuitive. Much more screen noise.

Whatever is chosen must satisfy CLAUDE.md §7: **not colour-alone**, and mirrored in the
square's accessible name — `square-presentation.ts` already has the vocabulary and would
gain kinds like `mirror-threat-only`.

## Acceptance criteria (to be finalised once the direction is chosen)

- [ ] A square a piece may *move* to across the seam is visually distinct from one it may
      only *capture* on.
- [ ] Both are distinguishable **non-visually**, via `aria-label`.
- [ ] Neither is confusable with an ordinary move, an ordinary capture, or a check path.
- [ ] Works in light and dark themes.
- [ ] The default view is not overwhelming when several kinds are on screen at once.
- [ ] E2E coverage under a quiet-only and a capture-only ruleset.

## Current state, so the gap is precise

The engine is already correct — `portalQuiet` and `portalCaptures` are separate, and
attack generation uses only the latter. `src/shared/ui/square-presentation.ts` has
`mirror-move` and `mirror-capture` hint kinds, and `hintClassesFor` maps them to CSS.

**What is missing is the case where a piece attacks a square it cannot move to.** That
square currently gets *no hint at all*, because hints are derived from the legal-move
list. It is invisible.

## Related

- Spec [§12](../rules/mirror-portal-spec.md) — the rule that created this.
- [`../game-logic/king/check-highlighting.md`](../game-logic/king/check-highlighting.md) —
  the existing visual language this must extend without breaking.
- **Correction (2026-08-04):** this section used to claim a `portal-modes.e2e.ts` existed
  and gave the UI work "a regression net under it". **It does not exist and never did**,
  and nothing else covers the quiet/capture split end-to-end either — found by
  `scripts/check-docs-links.js` on the day that checker was written, which is exactly the
  rot it exists to catch. Anyone picking this story up starts *without* a net.
  What does exist:
  - [`../balance/rule-flags.e2e.ts`](../balance/rule-flags.e2e.ts) — covers whole-piece
    on/off tokens (`------`, `BRQ---`), where both rights move together. It says nothing
    about a piece holding one right and not the other, which is the case this story is
    about.
  - Unit coverage of the split itself is in
    [`../../../src/game/rules.test.ts`](../../../src/game/rules.test.ts) and
    [`../../../src/game/mirror-portal.test.ts`](../../../src/game/mirror-portal.test.ts).

  **First task of this story is therefore to write that e2e**, not to change pixels.
