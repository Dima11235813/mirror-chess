# Mirror Portal — authoritative rules spec (v1)

> **Status: CONFIRMED by the owner (2026-07).** This document is the single source
> of truth for the mirror mechanic. All move-generation code and tests derive from
> it. If code disagrees with this file, the code is wrong. If this file is silent on
> a case, **stop and get a decision** — do not invent behavior (that is the mistake
> the reboot exists to fix).

## 1. Concept

Mirror Chess is standard chess on **one 8×8 board**. The **left edge (`a`-file) and
right edge (`h`-file) are mirror portals**: for every rank `r`, the squares `a{r}`
and `h{r}` are linked. A piece sliding into an edge may **step through the portal to
the mirrored file at the same rank and continue its line on the far side.**

Landing squares are ordinary board squares (there is no separate "side board"). The
"mirror board" is a mental model for how the piece got there.

## 2. Scope (confirmed decisions)

| Decision | Choice |
| --- | --- |
| Board model | **Single 8×8** with edge portals (not a literal tri-board) |
| Portal depth | **Keep sliding** through the portal until blocked / edge |
| Sliders — Bishop, Rook, Queen | **Portal by transit** — §4 |
| Steppers — Knight, King, Pawn | **Portal by file wrap** — §11 (confirmed 2026-07-30) |
| Check / checkmate / pins | **Specified** — §10 |
| Move and attack | **One right per piece** — a piece attacks exactly where it can move, the pawn excepted as in chess (§12, revised 2026-09-22) |
| Notation | **Adopted** — the `*` seam tag, §8.5 |

> §4 and §11 are two different crossings, because a slider *passes through* the seam
> mid-ray while a stepper simply *lands* somewhere. Read §11's opening note before
> assuming one generalizes to the other.

### 2.1 The governing principle (owner, 2026-09-22)

> **The movement space expands; the rules stay the same.**

The seam changes the *geometry* a piece moves through. It does not change what chess says
about that piece. So each piece keeps its own chess relationship between moving and
attacking:

- Bishop, rook, queen, knight, **king** — attack exactly the squares they can move to.
  One portal right per piece: it crosses, or it does not.
- **Pawn** — moves by pushing and attacks diagonally, so only its *capture* can cross
  (a push has no file component). That asymmetry is chess's, not ours.

**Six flags, 64 rulesets**, with all six off being ordinary chess.

This principle decides cases the spec would otherwise have to enumerate, and it is the
reason §12's four-mode model was retired — see §12's banner.

## 3. Coordinates & terms

- Files `a..h` → `f ∈ 0..7`. Ranks `1..8` → `r ∈ 0..7`. Square index `r*8 + f`.
- **`mirrorFile(f) = 7 - f`** (`a↔h, b↔g, c↔f, d↔e`). The portal maps `(0, r) ↔ (7, r)` — **same rank**.
- **Ray**: a straight line of squares from the origin in a fixed direction `(df, dr)`.
- **Edge square of a ray**: the on-board square where a ray with `df < 0` reaches the
  `a`-file (`f = 0`), or a ray with `df > 0` reaches the `h`-file (`f = 7`).

## 4. The portal rule (precise)

For each of a slider's directions `(df, dr)`:

1. **Walk the standard ray** from the origin: each empty square is a normal
   destination; the first enemy square is a capturing destination and stops the ray;
   an own piece stops the ray just before it. (Standard chess sliding.)
2. **Portal extension.** If the ray has a horizontal component (`df ≠ 0`) **and**
   reaches its **edge square with a clear path and that edge square is empty**, then:
   - Compute the mirror edge `M = (7 - edge.f, edge.r)` — **horizontal hop, same rank.**
   - **Continue the same direction `(df, dr)` starting at `M`**, applying standard
     sliding semantics: empty → mirror destination + keep going; enemy → mirror
     capture + stop; own piece → stop before it; the origin square → stop.
   - Every square emitted on the far side is flagged **`special: 'mirror'`**.
3. **At most one portal crossing per ray** (a ray never crosses a second seam; this
   is automatic — diagonals exit top/bottom and rank rays return to the origin — but
   is stated to keep implementations finite).

**Trap to avoid:** the portal hop `edge → M` does **not** change rank and does **not**
consume a diagonal step. A bishop leaving `a4` emerges at `h4` (same rank) and *then*
resumes the diagonal (`g5, f6, …`). Advancing the rank on the hop (a cylinder wrap)
is **wrong** and yields `h5` instead of `h4`.

### Classification / dedupe
If a square is reachable both as a standard move and as a mirror move, **keep the
standard one** (do not emit a second `mirror` hint for the same square). Otherwise
dedupe by `(to, special)`.

### Reference pseudocode
```text
for (df, dr) in piece.slideDirections:
    # standard ray
    f, r = origin.f + df, origin.r + dr
    while inBoard(f, r):
        if empty(f, r): emit move(origin → (f,r))
        else: if enemy(f,r): emit capture(origin → (f,r)); break else break
        f += df; r += dr

    # portal extension (sliders, df != 0)
    if df != 0 and rayReachesEmptyEdge(origin, df, dr) as edge:
        m = (7 - edge.f, edge.r)               # same rank
        f, r = m.f, m.r
        while inBoard(f, r) and (f,r) != origin:
            if empty(f, r): emit move(origin → (f,r), special='mirror')
            else: if enemy(f,r): emit capture(origin → (f,r), special='mirror'); break else break
            f += df; r += dr
```

## 5. Worked examples (the acceptance oracle)

Standard moves listed for completeness; **mirror** moves are the portal outputs.
Verified by hand from §4.

### 5.1 Bishop on `b3` (otherwise empty board)  ← owner's headline example
- Standard: `a4, c4, d5, e6, f7, g8, a2, c2, d1`
- **Mirror:** via `a4`→ **`h4, g5, f6, e7, d8`**; via `a2`→ **`h2, g1`**
- Headline check: the two portal mouths are **`h4` and `h2`** ✓

### 5.2 Bishop on `c1` (otherwise empty)
- Standard: `d2, e3, f4, g5, h6, b2, a3`
- **Mirror:** via `a3` (left)→ `h3, g4, f5, e6, d7, c8`; via `h6` (right)→ `a6, b7, c8`
- Note: `c8` is reachable via both portals → emitted **once**.

### 5.3 Rook on `a4`, enemy on `c4` (otherwise empty)
- Standard: right `b4, c4(capture)`; up `a5, a6, a7, a8`; down `a3, a2, a1`
- **Mirror:** left portal from `a4`→ **`h4, g4, f4, e4, d4`** (stops before `c4`,
  already a standard capture). This is the point of the portal: reach the far side of
  a blocker. On an *empty* rank the portal adds nothing new (all squares dedupe).

### 5.4 Queen
Queen rays = Rook rays ∪ Bishop rays; the portal applies to each horizontal-component
ray exactly as above. (E.g. a queen on `b3` gets the bishop mirror set from §5.1 plus
its rook-line portals.)

## 6. Occupancy & capture summary

- Portaling requires the **edge square reached with a clear path and empty** (you
  pass through it). An enemy on the edge square is a normal capture that **stops** the
  ray — no portal past it.
- On the far side, standard sliding: stop at first piece; capture if enemy; the
  **origin square stops the ray** (no self-capture, no infinite loop).
- Vertical rook/queen rays (`df = 0`) never portal.

## 7. Invariants (for property tests)

- **Symmetry:** the rule is left/right symmetric — mirroring a position across the
  center file mirrors the legal move set.
- **Superset:** every standard legal move remains legal; mirror moves are additive.
- **No rank change on the hop:** for any mirror destination `d` reached via edge `e`,
  the hop `e → mirror(e)` preserves rank; subsequent squares follow `(df, dr)`.
- **Finite:** each ray yields ≤ 15 squares (≤ one seam crossing).

## 8. Deferred (explicitly out of v1 — separate stories, do not implement yet)

1. ~~**Knight portal**~~ **Specified in §11.** Note the old notes' `a3→h3`
   "file mirror on the same rank" idea was **not** adopted — §11 wraps the file and
   keeps the L's rank, so `a3` reaches `h5, g4, g2, h1`, never `h3`.
2. ~~**King / Pawn portal**~~ **Specified in §11.**
3. ~~**Legality layer** — check/checkmate, self-check filtering, pins.~~
   **Specified in §10.** Attack generation accounts for portal moves (a bishop
   attacks through the seam).
4. ~~**Special moves** — castling, promotion, en passant.~~ **Specified in §13.**
   Promotion and castling turn out to be untouched by the seam; **en passant is not** —
   a pawn's capture diagonals wrap, so en passant can happen between pawns seven files
   apart.
5. ~~**Notation**~~ **Adopted 2026-09-22 — see §8.5 below.**
6. **Multi-crossing** — v1 caps at one seam per ray; revisit only if desired.

### 8.5 Notation (adopted 2026-09-22)

Standard SAN, with **`*` marking a seam crossing**. The tag goes after the destination
square and before the check/mate suffix, so an ordinary chess game notates exactly as it
always did and the mirror only ever *adds* a character.

| Move | Written |
| --- | --- |
| Bishop crosses to `h4` | `Bb3–h4*` (or `Bh4*` when unambiguous) |
| …capturing there | `Bxh4*` |
| …with check | `Bxh4*+` — and `#` for mate |
| Promotion (never crosses; §13.1) | `e8=Q` |
| Promotion **by capturing through the seam** | `axh8=Q*` |
| En passant across the seam (§13.2) | `axb6 e.p.*` |
| Castling (never crosses; §13.3) | `O-O` / `O-O-O` |

**Disambiguation keeps SAN's rule** — file, then rank, then both — and the seam makes it
bite more often, because two pieces can now reach one square by different routes. When a
square is reachable by a standard move *and* a crossing, dedupe keeps the standard move
(§4), so the `*` form never competes with a non-`*` form for the same destination.

A game record carries the **ruleset token** alongside the moves; the same move text under
a different ruleset is a different game.

> **Why a suffix rather than a new glyph:** every chess tool, reader and habit survives
> unchanged, and a Mirror Chess record degrades gracefully — strip the `*`s from an
> all-flags-off game and it is valid PGN.

## 9. Reconciliation — DONE (2026-07-30)

`src/game/moves.ts` used to implement several **contradictory** interpretations
(`horizontalPortalWrap`, `diagonalPortalWrap`, per-piece same-rank mirror, knight
adjacent-rank capture, pawn projection). It has been re-derived from §4, the
contradictory branches are deleted, knight/king/pawn are standard chess, and §5 is
encoded as the unit-test oracle (`src/game/mirror-portal.test.ts`). The
`prj-mgmt/epics/game-logic/*` stories that predated this file are reconciled or
marked superseded. Story: [`reconcile-core-to-spec.md`](./reconcile-core-to-spec.md).

## 10. Legality (v2)

> **Status: derived, not invented.** Everything here is either standard chess or
> follows from §4–§6 plus the one mirror-specific decision already recorded in §8.3
> — *portal moves are attacks*. Nothing in this section introduces a new mirror rule.
> It is written down so the legality layer has an oracle, exactly as §1–§7 do for
> move generation.

### 10.1 Attacked squares

A square `s` is **attacked by color `c`** if any piece of color `c` could capture on
`s`. Attack generation is move generation with two standard corrections:

- **Pawns attack their two forward diagonals unconditionally** — whether or not a
  piece stands there, and regardless of whether the pawn could legally push. Pawn
  *pushes* are not attacks.
- **Knight and king attack every square in their step set**, occupancy irrelevant.
- **Sliders (B/R/Q) attack along their rays exactly as they move, portal included.**
  A ray stops at the first occupied square, and that square is attacked. **A portal
  ray attacks the far side of the seam**: a bishop on `b3` attacks `h4, g5, f6, e7,
  d8` and `h2, g1` (§5.1), so a king on any of those squares is in check.
- The portal preconditions from §4 apply unchanged to attacks: the edge square must
  be reached with a clear path and be **empty**. An enemy king standing *on* the edge
  square is attacked as an ordinary capture that stops the ray (§6) — there is no
  portal past it.

### 10.2 Check

`c` is **in check** when the square of `c`'s king is attacked by the opposing color.
A position with no king of color `c` is **never** in check for `c` — this keeps
partial test positions (`w:Bb3`) legal and unfiltered.

### 10.3 Legal moves

A pseudo-legal move (§4) is **legal** iff, after it is applied, the mover's own king
is not attacked. This single rule yields self-check prevention, pins, and the
requirement to resolve an existing check — none of them need separate handling.

Consequences worth stating because they are easy to get wrong:

- A king may not move **along** a checking slider's ray away from it: legality is
  evaluated on the board *after* the move, where the king's old square is empty and
  the ray extends.
- A king may not capture a **defended** piece, for the same reason.
- A pinned piece may still move **along** the pinning ray, including capturing the
  pinner.
- A check delivered through the seam is resolved like any other: capture the
  attacker, block anywhere on its path (near side **or** far side of the seam), or
  move the king.

### 10.4 Terminal states

With `c` to move and no legal move available:

- **Checkmate** if `c` is in check.
- **Stalemate** otherwise.

Neither is a rule about mirroring; both fall out of §10.3.

Draws by repetition, the 50-move rule and insufficient material needed move history and
are now **specified and implemented** — see
[`draw-rules.md`](./draw-rules.md). Two of the three are pure counting and owe nothing to
this spec; **insufficient material is not**, and is the one place where a chess rule had
to be re-derived rather than inherited:

- A bishop that may **capture** across the seam can checkmate a lone king by itself
  (`Ka1, Bd4` vs `Kh8`), because its second diagonal re-enters through the seam and
  covers the flight squares. So `K+B vs K` is a dead position only when the bishop's
  capture right at the seam is off.
- A bishop that may cross the seam by **either** right changes square colour when it does
  (the hop preserves rank and swaps `f` for `7 - f`, and `0` and `7` differ in parity).
  So `K+B vs K+B on one colour` stops being a closed material class, and is a dead
  position only when the bishop cannot cross at all.
- `K vs K` and `K+N vs K` are unchanged under every flag setting.

Checkmate is decided **before** any draw: a mate on the hundredth halfmove is a mate.

### 10.5 Still deferred after this section

~~Castling interacts with attacked squares… but castling itself remains deferred.~~
**Castling, promotion and en passant are specified in §13**, and castling's three
"not out of / through / into check" tests are exactly this section's attacked squares —
including attacks arriving through the seam, which lets a rook in one corner forbid
castling in the opposite one (§13.3).

Notation for check/mate (`+` / `#`) still depends on §8.5.

## 11. The stepper portal — Knight, King, Pawn (v2)

> **Status: CONFIRMED by the owner (2026-07-30).** Chosen from explicit options:
> the knight crosses by *L measured across the seam*, and king and pawn cross too.

### 11.1 Why this is not the same crossing as §4

A slider **passes through** the seam in the middle of a ray, so §4 gives it a *free*
horizontal hop — `a4 → h4`, rank unchanged — and the ray then continues. The rank is
untouched by the crossing because the crossing is transit, not a step.

A stepper has no transit. It jumps from one square to another, and there is nothing
for a "free hop" to attach to. So a stepper crosses by **wrapping the file of its
landing square**, keeping the rank its own move dictates.

**Do not generalize one rule to the other.** They agree wherever the movement is
purely horizontal (a king stepping `a4 → h4` matches a rook's `a4 → h4`) and diverge
on diagonals, deliberately — see §11.5.

### 11.2 The rule

For a stepper on `(f, r)` with a move offset `(df, dr)`:

```text
rawFile = f + df
newRank = r + dr
if newRank is off-board:  no move          # ranks never wrap; there is no top/bottom portal
newFile = (rawFile + 8) mod 8
wrapped = rawFile < 0 or rawFile > 7
```

- The destination is `(newFile, newRank)`, subject to the ordinary occupancy rule:
  empty → a move, enemy → a capture, own piece → nothing.
- The move is flagged **`special: 'mirror'`** exactly when `wrapped` is true.
- When `rawFile` is already on the board the formula is the identity, so standard
  chess is unchanged.
- **Ranks never wrap.** Only the `a`/`h` seam exists.

Applies to: **knight** offsets, **king** offsets, and **pawn capture** diagonals.
A pawn *push* has `df = 0` and therefore never wraps — pawns still cannot move
sideways, and the seam does not shorten or lengthen a pawn's journey to promotion.

### 11.3 At most one crossing

`|df| ≤ 2` for every stepper, so `(rawFile + 8) mod 8` can cross the seam at most
once. The §4.3 cap holds here for free.

### 11.4 Worked examples (the acceptance oracle)

**Knight `a3`** — 8 moves, none lost to the edge:
- Standard: `b5, c4, c2, b1`
- **Mirror:** `h5` (via `-1,+2`), `g4` (`-2,+1`), `g2` (`-2,-1`), `h1` (`-1,-2`)
- Note `h3` is **not** among them; the old "file mirror, same rank" idea is rejected.

**Knight `h6`:**
- Standard: `g8, f7, f5, g4`
- **Mirror:** `a8` (`+1,+2`), `b7` (`+2,+1`), `b5` (`+2,-1`), `a4` (`+1,-2`)

**King `a4`** — 8 moves:
- Standard: `a5, a3, b5, b4, b3`
- **Mirror:** `h5, h4, h3`

**White pawn `a4`:**
- Push: `a5`. Captures: `b5` (standard), **`h5`** (mirror) — only if an enemy is there.

**Black pawn `h5`:**
- Push: `h4`. Captures: `g4` (standard), **`a4`** (mirror).

### 11.5 Consequence worth stating plainly

A **king** on `a4` stepping north-west lands on `h5`. A **bishop** on `a4` moving
north-west emerges on `h4` and continues to `g5` — it never lands on `h5`. Both are
correct under their own rule. This is the visible edge of §11.1 and is intentional,
not an inconsistency to "fix".

### 11.6 Interaction with the rest of the spec

- **Attacks (§10.1).** Stepper portal moves are attacks like any other: a knight on
  `a3` attacks `h5`, a pawn on `a4` attacks `h5`, so a king there is in check. Pawn
  attack diagonals wrap even though pawn pushes do not.
- **Legality (§10.3).** Unchanged — a stepper portal move is filtered by king safety
  exactly like any other move.
- **Edge pawns are no longer weak.** Every pawn now has two capture squares, which
  removes the a/h-file asymmetry of standard chess.
- **Kings can no longer be cornered by the board edge**, which changes mate patterns
  substantially. Expect previously-mating positions to stop mating.
- **Still deferred:** castling, promotion, en passant (§8.4) and notation (§8.5).

## 12. Quiet move and capture are separate powers (v3)

> **Status: RETIRED as the default model (owner, 2026-09-22). Kept as an experimental
> extension, and kept in full because the reasoning still matters.** §2.1's principle —
> *the movement space expands, the rules stay the same* — requires that a piece attack
> exactly where it can move (the pawn excepted), so a piece may not hold one right
> without the other. The four modes of §12.3 are therefore **not** part of the standard
> game; the flag space returns to **six flags, 64 rulesets**.
>
> **What forced it was the king.** §12.4 below argues that two kings standing
> seam-adjacent is "coherent and symmetric… checkmate keeps its ordinary meaning". It is
> symmetric, and it *is* decidable — but a king that can step to a square controls that
> square, so a king crossing without attacking breaks the rule that a king may not move
> into check. Measured 2026-09-22: with the king's capture right off, `Kb1–a1` is legal
> beside a black king on `h1` and neither is in check
> ([`../balance/readiness-probe.md`](../balance/readiness-probe.md) §3).
>
> The same objection applies to every non-pawn piece — a bishop that slides across the
> seam but cannot capture there also controls squares it does not attack — which is why
> the retirement is general rather than a king-shaped patch.
>
> **What survives, and is load-bearing:** §12.2 (*attack follows capture*, now read as
> *attack follows the single right*), §12.4's pawn reasoning, and §12.7's separation of
> move generation from attack generation. **What is retired:** §12.1's independence,
> §12.3's four modes, and §12.4's adjacent-king paragraph.
>
> The token format is **unchanged** (ADR 0004 is append-only): all eleven slots still
> parse and still mean what they meant, but a ruleset whose two rights differ for a
> non-pawn piece is **non-standard** — outside the study, off the rules picker, and
> flagged as experimental. → [`adjacent-kings.md`](./adjacent-kings.md)
>
> Original proposal and reasoning:
> [`move-capture-split.md`](./move-capture-split.md).

### 12.1 The rule

Each piece has **two independent portal rights**:

- **quiet** — may it move across the seam onto an **empty** square?
- **capture** — may it **capture** across the seam?

Both crossings are covered: slider transit (§4) and stepper wrap (§11).

### 12.2 Attack follows capture

**"Attacked" is not a primitive.** In chess it means *"an enemy piece could capture on
this square next move"*, and check is that predicate applied to the king's square. So:

> **A piece gives check across the seam if and only if it may capture across the seam.**

This is a generalisation of a rule chess already has. FIDE Art. 3.1.3: *"a piece is
considered to attack a square even if this piece is constrained from moving to that
square because it would then leave or place the king of its own colour under attack."*
Attack set ≠ legal move set is already how pins work.

There is **no third, independent "attack" power.** A piece that could "attack" a square
it can never capture on would put a king in check from a threat that cannot be executed,
and checkmate would stop meaning anything.

### 12.3 The four modes

| quiet | capture | The seam is… |
| --- | --- | --- |
| off | off | closed for this piece — ordinary chess |
| **on** | off | **purely positional** — reposition through it; no strike, no check |
| off | **on** | **purely tactical** — strike and check through it; no repositioning |
| on | on | fully open |

### 12.4 Consequences that are intended, not defects

**Two kings may stand seam-adjacent** when the king's capture right is off. This is
coherent and symmetric: the flags are per *piece kind*, so both kings share them — if one
does not attack across the seam, neither does. Checkmate keeps its ordinary meaning
throughout: *the king is attacked and has no legal move.*

This differs from the Ultima Immobiliser pathology, where attack-ability is **dynamic and
per-piece-instance**, making "attacked" state-dependent. Ours is static per ruleset, so
the attack relation stays well-defined and symmetric.

**A pawn's quiet right is a no-op.** Pawn non-capturing moves are pushes, which have no
file component, so they can never cross the seam. Only the pawn's **capture** right is
meaningful. A quiet flag for pawns is therefore not allocated — token positions are
append-only (ADR 0004), so one can be added later if a rule ever needs it.

**Insufficient material becomes rule-dependent.** A piece whose capture right is off has
strictly less mating power, so "K+B vs K is a draw" is no longer constant. This compounds
the bishop-colour-parity finding in [`draw-rules.md`](./draw-rules.md).

### 12.5 Defaults

**Every piece that crossed under §2/§11 now has both rights on**, so the default game is
unchanged. Narrower modes are opened for study, not adopted by fiat.

### 12.6 Worked examples

A **bishop on `b3`, quiet on / capture off**, with a black rook on `h4`:

- `h4, g5, f6, e7, d8` and `h2, g1` remain *quiet* destinations where empty.
- `h4` is **not** offered — it is occupied by an enemy, and capture is off.
- A black king on `g1` is **not** in check.

The same bishop, **quiet off / capture on**:

- Empty far-side squares are **not** offered.
- `h4` **is** offered, as a capture.
- A black king on `g1` **is** in check.

### 12.7 The invariant this creates

Move generation and attack generation now answer **different questions** and must be
separate functions. Every consumer must use the right one:

| Consumer | Uses |
| --- | --- |
| check detection, king-safety, pins, mate | **capture** rights only |
| move generation | both |

Definition drift between them is the highest-value thing to test: a bug is invisible in
almost every position and surfaces as an illegal mate.

## 13. Special moves — promotion, en passant, castling (v4)

> **Status: CONFIRMED by the owner (2026-08-04).** Resolves the §8.4 deferral. Each of
> the three was checked against the seam before being written; the findings are below,
> and two of them are not what chess would have predicted.

The organising principle of this section is that **the seam is vertical and two of these
three rules are horizontal**, so most of the interaction is nil — but not all of it, and
the exceptions are precisely where a chess intuition would mislead.

### 13.1 Promotion

A pawn reaching its far rank — rank 8 for White, rank 1 for Black — is replaced, as part
of the same move, by a Queen, Rook, Bishop or Knight of its own colour. The choice is the
mover's; there is no restriction, and a promotion is available whether the pawn arrives by
a push or by a capture.

**Nothing about the rank changes at the seam.** Ranks are not what the portal links.

**But a pawn may promote by capturing *through* the seam.** A pawn's capture diagonals
wrap (§11.2), so a White pawn on `a7` may capture onto `h8`, and one on `h7` onto `a8`.
Both promote. This follows from §11.2 with no new clause; it is called out only because
it is startling to see.

> **Consequence worth stating.** Promoting to a Bishop is a real choice here rather than a
> curiosity. A Bishop that may capture across the seam is **mating material on its own**
> (see [`draw-rules.md`](./draw-rules.md)), so under-promotion to a Bishop can win a game
> that under-promotion to a Knight cannot.

### 13.2 En passant

State the rule exactly as chess states it, in terms of **attack**:

> Immediately after a pawn advances two squares from its starting rank, any enemy pawn
> that **attacks the square it passed over** may capture it, moving to that passed-over
> square. The right expires if not used at once.

Written that way, the seam needs no new clause — it arrives through §11.2, which already
says a pawn's capture diagonals wrap. The consequences are:

- **En passant crosses the seam.** A White pawn on `a5` attacks `h6`. So if Black plays
  `h7–h5`, White's `a5` pawn may capture it *en passant*, landing on `h6` — a capture
  between pawns standing seven files apart.
- **The double push itself never crosses.** A push has no file component (§11.2), so the
  advancing pawn's two-square move is ordinary in every ruleset.
- **The right is gated by the pawn's capture flag** (§12). With the pawn's
  capture-across right off, `a5` does not attack `h6` and no such capture exists — so
  ordinary chess remains an exact configuration.

Stating it as "attacks the passed-over square" rather than "stands on an adjacent file"
is what keeps §12.7's invariant intact: attack and capture continue to agree. The
alternative — permitting the attack but forbidding the capture — was considered and
rejected for exactly that reason.

### 13.3 Castling

**Ordinary chess castling, unchanged.** The king moves two squares toward a rook on its
own first rank; the rook jumps to the square the king crossed. Both must be unmoved, the
squares between them empty, and the king may not castle **out of, through, or into**
check.

**The seam does not reach it.** The roadmap flagged a wrinkle — §11 lets a stepper wrap
the file, and the king's castling step is horizontal, so might it wrap? It cannot, in the
standard game: the squares involved are `b1 c1 d1 e1 f1 g1` (and their eighth-rank
counterparts), none of which is an edge file, and the rook's travel `a1→d1` / `h1→f1`
crosses no seam either. The question is unreachable and is therefore **left unspecified**
rather than answered — a rule that cannot be exercised cannot be tested. Revisit only if a
Chess960-style setup is ever introduced.

**What the seam does change is who may forbid it**, and this is a genuinely new property:

> Because a rook on `a1` attacks `h1, g1, f1, e1` *through the seam*, an enemy rook
> sitting in one corner can forbid castling on the **opposite** side of the board.

This needs no rule of its own — it falls out of §10.1 attacked squares — but it means the
three "not out of / through / into check" tests must be evaluated with seam-aware attack
generation, never with a chess-shaped shortcut.

A related fact, true from move one: in the initial position the two friendly rooks
**defend each other through the seam**, `a1 ↔ h1`. Harmless, and a useful sanity check
that portal attacks are switched on.

### 13.4 What this adds to a position's identity

Castling rights and the en-passant square become part of what makes two positions the
same, exactly as in chess. Both must therefore be included in the repetition key
(`src/game/position-key.ts`); omitting either makes genuinely different positions compare
equal and declares draws that are not draws.

The en-passant square is recorded **only when a capture is actually available**, which is
the standard treatment and keeps positions that differ in nothing observable from hashing
differently.

### 13.5 Invariants (for property tests)

1. With every portal flag off, all three rules behave exactly as ordinary chess — checked
   against **published perft counts**, which these rules finally make reachable.
2. A promotion is generated as four distinct moves, never one.
3. En passant is available if and only if the capturing pawn attacks the passed-over
   square, for every ruleset.
4. No castling move is ever generated whose king path is attacked, including when the
   attack arrives through the seam.
5. A captured rook clears the castling right on its own corner.
6. En passant removes **two** pawns from a rank at once; the resulting position must still
   be legality-filtered, because a rank is a *cycle* here and the exposed attacker may be
   on either side of the seam.
