# Proposal — split each piece's portal into *quiet move* and *capture*

> **Status: SUPERSEDED as the default model (2026-09-22), retained as an experimental
> extension.** The owner's principle — *the movement space expands, the rules stay the
> same* (spec §2.1) — requires a piece to attack exactly where it can move, so the two
> rights are one right for every piece but the pawn. The standard space is **six flags,
> 64 rulesets**. → [`adjacent-kings.md`](./adjacent-kings.md)
>
> **What this document claimed, and what is true instead.** It argued that granular
> control "is precisely what makes the adjacent-kings case expressible rather than a
> defect". Measurement on 2026-09-22 showed what that case actually is: a king may step
> across the seam to a square beside the enemy king, and neither is in check — a king
> moving into check, invisibly, because the square looks safe to the move generator. The
> *mechanism* this document designed is sound and still live in the code; the **default**
> it argued for is not.
>
> Kept in full, and worth reading: §12.2 (*attack follows capture*), the pawn reasoning
> and the move-vs-attack separation all survive, and the split remains constructible
> behind `isStandardRuleSet` if a later study wants those modes.

**Status: ACCEPTED and IMPLEMENTED (2026-08-03).** Specified as
[`mirror-portal-spec.md`](./mirror-portal-spec.md) §12; live in `src/game/rules.ts`,
`moves.ts` and `attacks.ts`. This document is kept for the reasoning.

**The owner's decision:** two flags per piece, **including the king** — the granular
control is precisely what makes the adjacent-kings case expressible rather than a defect.
Every piece that crossed before keeps both rights, so the default game is unchanged;
narrower modes are opened for study.

## The idea

Today one flag per piece decides whether it crosses the seam at all. The proposal is to
split that into two independent flags:

- **quiet portal** — may the piece move across the seam onto an *empty* square?
- **capture portal** — may the piece *capture* across the seam?

## 1. First, a correction to the framing: it is capture, not "attack"

The idea was phrased as "move versus **attack**". That framing does not survive contact
with the rules, and the distinction matters enough to fix before anything is built.

In chess, **"attacked" is not a primitive** — it is defined operationally as *"an enemy
piece could capture on this square next move"*. Check is exactly that predicate applied
to the king's square. So attack-ability **is** capture-ability; it is not a third,
independent power a piece can have.

**Research confirms this is stronger than "coherent" — chess already works this way.**
FIDE Article 3.1.3: *"a piece is considered to attack a square even if this piece is
constrained from moving to that square because it would then leave or place the king of
its own colour under attack."* Attack set ≠ legal move set is already load-bearing in the
FIDE rules; that is how pins work. Defining attack as "reachable in **capture** mode" is a
generalisation of a rule chess already has
([`../../research/variant-precedent.md`](../../research/variant-precedent.md)).

That makes one of the two possible readings incoherent:

> If a piece could "attack" across the seam but not *capture* across it, then a king
> standing there would be in "check" from a threat that can never be executed. Checkmate
> would mean "you lose because of something that cannot happen." The rules would no
> longer mean anything.

The coherent decomposition is **quiet move** versus **capture**, with attack — and
therefore check — following the *capture* flag. Stated as a rule:

> **A piece gives check across the seam if and only if it may capture across the seam.**

With that correction, all four combinations per piece are well defined:

| quiet | capture | The seam is… |
| --- | --- | --- |
| off | off | closed for this piece (ordinary chess) |
| **on** | **off** | **purely positional** — it can slip through to reposition, but cannot strike through and never gives check through it |
| **off** | **on** | **purely tactical** — it cannot reposition through the seam, but it can strike through it, and it does give check through it |
| on | on | fully open (today's behaviour) |

### Use the existing vocabulary

Betza's piece notation already has exactly these two modality prefixes: **`m`** =
non-capture (move only), **`c`** = capture only, neither = both. The orthodox pawn is
`fmWfcF`. XBetza adds **`o`** for cylinder-board wrap.

**Name our flags after `m` and `c`, and the seam after `o`.** Do not invent a vocabulary
the variant community already has.

### It is shipped in production

**Fairy-Stockfish implements exactly this split.** `piece.h`:

```cpp
enum MoveModality { MODALITY_QUIET, MODALITY_CAPTURE, MOVE_MODALITY_NB };
std::map<Direction, int> slider[2][MOVE_MODALITY_NB];
```

with capture-only pieces in shipped configs (`q:cQ`, `r:cR`) and Empire's
`e:mQcN`. Its architectural lesson — **two parallel table sets, two entry points,
`attacks_bb()` and `moves_bb()`** — is directly applicable.

## 2. There is a 1,500-year precedent inside chess itself

The pawn already does exactly this: it **moves** forward (quiet only, never captures
that way) and **captures** diagonally (capture only, never moves there when empty). So
decoupling movement from capture is not exotic — it is the mechanic of the most common
piece on the board.

This is reassuring about coherence, and it is the reason the two new modes are likely to
*feel* like chess rather than like an abstraction.

## 3. It is 11 flags, not 12 — the pawn's quiet portal is a no-op

A pawn's non-capturing moves are pushes, which have no file component. **A push can never
cross the seam**, so a "pawn quiet portal" flag would control nothing.

### The king keeps both flags — a recommendation that was withdrawn

Research initially recommended constraining the king's two rights to be equal, citing
Ultima's Immobiliser: an immobilised king does not attack, so two kings can stand
adjacent and checkmate stops being equivalent to "could capture the king next move".

**That analogy does not transfer, and the recommendation was wrong.** Ultima's
immobilisation is **dynamic and per-piece-instance**, so "is this square attacked?"
becomes state-dependent and mate genuinely breaks. Our rights are **static and per piece
kind** — both kings necessarily share them. If kings do not capture across the seam then
*neither* does, symmetrically, and checkmate keeps its ordinary meaning: *attacked, with
no legal move*.

So two kings standing seam-adjacent is a **well-defined, symmetric, intended** position,
and the king keeps both flags. Recorded because the concern was relayed before it was
checked hard enough.

| Piece | Meaningful flags |
| --- | --- |
| Bishop, Rook, Queen, Knight, King | 2 each — quiet and capture |
| Pawn | 1 — capture only (a push has no file component) |

**11 flags → 2,048 variants.** The pawn reduction stands: a push has no file component,
so a pawn quiet right could never do anything. Token positions are append-only
([ADR 0004](../engine/adr/0004-ruleset-identity-and-tokens.md)), so one can be appended
later if a rule ever needs it — no need to reserve a permanently dead position now.

## 4. What it costs the engine: less than expected

The pleasing part. [ADR 0003](../engine/adr/0003-rule-configuration-in-the-hot-path.md)
compiles each ruleset into precomputed ray paths, exploiting the fact that *the portal is
equivalent to a longer ray*. The split **does not disturb that**:

- The **geometry is unchanged** — the path a piece walks is the same whether it may land
  on an empty square, an enemy, or both.
- Only the **emit policy** at each square changes: quiet-portal decides whether an empty
  far-side square is emitted; capture-portal decides whether an occupied one is.

So the ray tables are keyed on `quiet OR capture` (does this piece cross at all), and the
two flags are read where moves are emitted. **The split costs one predicate, not a new
table.** A slider with quiet-on/capture-off still stops at the first blocker — it simply
does not emit a capture there.

## 5. What it costs elsewhere — the honest list

- **The configuration space grows ~32×**, from 64 to 2,048. This is the real cost, and it
  is what makes the variant study a computational-science problem rather than a loop.
  Research is running on it now
  ([`../../research/README.md`](../../research/README.md)) — fractional factorial and
  screening designs, racing algorithms, bandit allocation, surrogate models.
- **`rules.test.ts` currently asserts that moves and attacks vanish *together*** when a
  flag is switched off. Under the split they vanish **independently by design**, so that
  test encodes the old model and must be rewritten — carefully, because the property it
  was protecting (generation and attack detection never disagreeing) is still vital, just
  differently expressed.
- **The token format needs 11 positions**, and the schema question from ADR 0004 becomes
  live: appending is safe, but the existing 6-position tokens must keep their current
  meaning. A `BRQNKP` token minted today means "quiet and capture both on for those
  pieces", so the expansion is a *widening*, not a redefinition — which is exactly the
  case the append-only rule was designed for.
- **Two flags per piece may be over-parameterised for the study.** If quiet-only and
  capture-only variants turn out to play almost identically to fully-open ones, we will
  have multiplied the experiment by 32 for nothing. **This is itself a cheap thing to
  test early** — measure a handful of piece/mode combinations before committing to the
  full space.

## 6. Open questions for the owner

1. **Adopt the quiet/capture decomposition?** With attack following capture, as §1
   argues. The alternative — attack as an independent third flag — is not available; it
   makes check meaningless.
2. **Is the pawn's capture-only portal wanted at all?** It is the flag most likely to
   distort pawn structure and promotion races, and it is the one mode the current
   `BRQ---` engine baseline does not exercise.
3. **Should the study space really be all 2,048?** §5's last point suggests a cheap
   pre-screen first. The research round now running should be read before committing.
4. **Does the split apply to both crossing kinds** — slider transit (§4) *and* stepper
   wrap (§11)? The document above assumes yes.
5. **Accept the king constraint?** The alternative is a game where two kings may stand
   adjacent across the seam, which breaks the equivalence between checkmate and
   king-capture. Ultima demonstrates that this is survivable but genuinely confusing.

## 7. The invariant to build in from the start

From Fairy-Stockfish's architecture and from the pitfall list: **two functions, never
one.**

```ts
attacksFrom(...)      // check, king safety, pins, mate detection call ONLY this
quietMovesFrom(...)   // move generation calls both
```

**Definition drift between "moves" and "attacks" is the highest-value invariant to
test.** A bug there is invisible in 99% of positions and surfaces as an illegal mate.
Make it a lint-able rule, and write a characterisation test asserting that no
check-detection path calls the move generator.

Two more consequences worth recording now:

- **Insufficient-material logic becomes variant-dependent.** A piece with seam-capture
  off has strictly less mating power, so "K+B vs K is a draw" is no longer a constant.
  This compounds the bishop-colour-parity finding already in
  [`draw-rules.md`](./draw-rules.md).
- **The UI must render the move set and the attack set as distinct**, non-visually as
  well as visually (CLAUDE.md §7). A move-only portal square that *looks* like a threat is
  a UX bug — and this variant will have many of them.

Nothing here is implemented. Per CLAUDE.md §11, the rules do not change until this is
decided and written into
[`mirror-portal-spec.md`](./mirror-portal-spec.md).
