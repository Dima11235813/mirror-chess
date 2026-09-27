# Research — divergent pieces and configurable variant engines

> Round 2, stream 5 of 5, 2026-08-02. See [`README.md`](./README.md).
> chessvariants.com returns HTTP 403 to automated fetch, so several variant details came
> via search snippets and Wikibooks; flagged at the end.

## The verdict on the move/capture split: better than coherent — chess already does it

**FIDE Article 3.1.3:** *"a piece is considered to attack a square even if this piece is
constrained from moving to that square because it would then leave or place the king of
its own colour under attack."* Article 3.9.1 says the same for check.

So **attack set ≠ legal move set is already load-bearing in the FIDE rules** — that is
how pins work. Defining "attacks = destinations reachable in **capture** mode" is a
*generalisation of a rule chess already has*, not a new hazard.

This upgrades the argument in
[`../epics/rules/move-capture-split.md`](../epics/rules/move-capture-split.md) §1: the
decomposition is not merely coherent, it is the existing structure of the rules.

## "Divergent" is the term of art, and the precedent is abundant

| Variant | The mechanic |
| --- | --- |
| **Empire Chess** | Eagle **moves like a queen, attacks like a knight only**; Cardinal moves like a queen, attacks like a bishop only |
| **Orda Chess** | Archer moves as knight, captures as bishop; Lancer moves as knight, captures as rook |
| **Berolina** (1926) | Pawn's modes swapped — moves diagonally, captures straight |
| **Ultima / Baroque** (1962) | The maximal case: every piece but the king moves like a queen and captures by an unrelated mechanism |
| **Rococo** | A revision of Ultima; outer ring may only be entered *if necessary for a capture* — itself a geometry-conditional move/capture asymmetry |
| **Patrol Chess** (1975) | Captures and checks only if the capturing piece is guarded — precedent that **check itself** can be conditional on something other than reachability |

**Orda is reported as "incredibly balanced by engine evaluation with a near 50–50 win
ratio"** — heavy divergence did not wreck balance. That is directly encouraging.

**The designer's lesson:** decoupling is cheap when both modes are short-range and
adjacent (pawn, Berolina — humans see them). It gets expensive when a **long-range** mode
diverges from the attack mode (Empire's Eagle, Ultima), because *the danger squares are
not the squares the piece can go to*. Ultima's reputation is "deep but hard to learn",
and Rococo exists because Ultima's edge interactions needed fixing.

A useful negative data point: **Betza had the vocabulary for divergence and mostly did
not use it** in Chess with Different Armies, preferring to compound atoms. Divergence was
a tool of last resort.

## Betza notation is literally our vocabulary — do not invent one

- **`m`** = non-capture (move to empty squares only)
- **`c`** = capture only
- **neither prefix** = both (the default)

The orthodox pawn is `fmWfcF`. `mNcB` is the *Knibis* — moves as knight, captures as
bishop. And critically, **XBetza (XBoard) defines `o` as the cylinder-board modifier**,
"which would wrap around from the side edges."

> **Our flags are, in existing notation, the cross product of `{m, c}` with an `o`-like
> seam modifier.** Name them after `m` and `c`, and the seam after `o`. Adopting
> Betza-style strings as the internal spec language makes our rules readable by anyone in
> the variant community.

*(Unverified: whether XBetza's parser actually accepts `o` composed with `m`/`c` — e.g.
`omR` for "wraps only for quiet moves". The grammar is prefix-composable and it should
parse, but no worked example was found. Verify before adopting the string form.)*

## Fairy-Stockfish already implements this split in production

The most relevant engine prior art, and its architecture is **rule-centric, not
variant-centric**: the stated goal was to make move generation "consider the individual
rules of a chess variant independently so that a variant can simply be defined as a set
of such rules."

`piece.h` declares exactly our decomposition:

```cpp
enum MoveModality { MODALITY_QUIET, MODALITY_CAPTURE, MOVE_MODALITY_NB };
std::map<Direction, int> steps[2][MOVE_MODALITY_NB];
std::map<Direction, int> slider[2][MOVE_MODALITY_NB];
```

Shipped configurations use it: Empire's `customPiece1 = e:mQcN`, and **capture-only
pieces** in the Massacre variant (`q:cQ`, `r:cR`). Termination semantics are data too —
`checkmateValue`, `stalemateValue = loss`, `extinctionValue`, `nFoldRule`.

**Wrap-around is *not* supported** — no cylindrical option appears in `variants.ini`, the
wiki, or issue search. So Fairy-Stockfish is our model for the **modality split**, not for
our **geometry**. *(Absence of evidence, not proof.)*

### The architectural lesson: two parallel table sets, two entry points

```cpp
extern Bitboard PseudoAttacks[COLOR_NB][PIECE_TYPE_NB][SQUARE_NB];
extern Bitboard PseudoMoves[2][COLOR_NB][PIECE_TYPE_NB][SQUARE_NB];
```

with `attacks_bb(...)` and `moves_bb<Initial>(...)` as separate entry points, rebuilt when
a variant loads. The wiki is candid about the trade: "this generality of course comes at
the expense of performance, but on the upside allows very fast implementation of new
variants."

> **"Two functions, never one."** `attacksFrom(...)` and `quietMovesFrom(...)`. Check,
> king-safety and pin logic call **only** the first. Make it a lint-able invariant, and
> write a characterisation test asserting that no check-detection path calls the move
> function.

And: **do not model 1,024 variants — model the independent rule bits.** The combinatorial
count is emergent and should never appear in code. This is the same discipline that fixes
CLAUDE.md §0's original failure (five incompatible notions of "mirror"): one struct, one
parser, one place the rules live.

## The pitfall that changes our flag count: the king

> **If the king's two seam flags differ, adjacency becomes non-symmetric** — king A
> attacks king B across the seam but not vice versa.

Ultima has exactly this pathology through the Immobiliser: an immobilised king does not
attack, so **two kings can legally stand adjacent**, and checkmate stops being equivalent
to "could capture the king next move". Ultima's own rules literature is openly
contradictory about whether the goal is mate or king-capture — *and that contradiction is
itself the finding.*

**Recommendation: constrain the king's seam-quiet and seam-capture flags to be equal**
(or forbid both), unless the anomaly is wanted deliberately.

> **This recommendation was examined and rejected on 2026-08-03.** The Ultima analogy
> does not transfer: its immobilisation is *dynamic and per-piece-instance*, making
> "attacked" state-dependent, whereas our rights are *static and per piece kind*, so both
> kings necessarily share them. The attack relation therefore stays symmetric and
> checkmate keeps its ordinary meaning. The king keeps both flags — see
> [`../epics/rules/move-capture-split.md`](../epics/rules/move-capture-split.md).

> **Measured 2026-09-22 — half of that rebuttal is right, and the half that is wrong is the
> conclusion.** The symmetry argument holds exactly as stated: both kings share one static
> ruleset, so the attack relation is symmetric. But symmetric **non**-attack is still the
> Ultima outcome. With `K` quiet on and capture off, a white king on `b1` may legally play
> to `a1` beside a black king on `h1`, and neither is in check:
>
> | Ruleset | `a1` attacked by black K | White `Kb1 → a1` |
> | --- | --- | --- |
> | K quiet only | **false** | **legal — kings adjacent** |
> | K quiet + capture | true | illegal |
>
> So **checkmate does not keep its ordinary meaning** in those 512 rulesets: it stops being
> equivalent to "could capture the king next move".
>
> **Outcome (owner, 2026-09-22): this stream's original recommendation was right, and for a
> stronger reason than it gave.** Not "constrain the king's flags" as a special case, but
> *a piece attacks exactly where it can move* as a general principle (spec §2.1) — a king
> that can step to a square controls it, so crossing without attacking lets a king move into
> check invisibly. §12's split is retired as the default for every non-pawn piece and the
> space is **6 flags / 64 variants**; the eleven token slots still parse, but rulesets whose
> rights differ are non-standard.
> → [`../epics/rules/adjacent-kings.md`](../epics/rules/adjacent-kings.md)
>
> The Ultima analogy, rejected in August as not transferring, transferred after all — by a
> different route than the one this file proposed.

### Consequence for the configuration space — as decided

| Piece | Meaningful flags |
| --- | --- |
| Bishop, Rook, Queen, Knight, **King** | 2 each — quiet and capture |
| Pawn | 1 — capture only (a push has no file component) |

**11 flags → 2,048 variants.** Only the pawn reduction survived scrutiny; the king
constraint above did not.

> **Superseded 2026-09-22 → 6 flags / 64 variants.** See the correction above: the king
> constraint was reinstated as a consequence of a general principle, not as a special case.
> The table's *reasoning* about which flags are meaningful still holds — it is the
> independence of the two rights that was retired, not the analysis of what each does.

## Other pitfalls, ranked

1. **Definition drift between "moves" and "attacks"** is the highest-value invariant to
   test. Every consumer must be told which it wants: check detection, king-move legality,
   pin/discovery detection and mate detection all use **capture** geometry; move
   generation uses both. A bug here is invisible in 99% of positions and surfaces as an
   illegal mate.
2. **Stalemate and zugzwang shift but do not break.** Move-only seam = extra quiet tempo
   moves ⇒ fewer stalemates, weaker zugzwang. Capture-only seam = attack without added
   escape squares ⇒ *more* stalemates. Ultima went as far as making stalemate a win.
   Measure rather than assume.
3. **Insufficient-material logic cannot be hardcoded** — a piece with seam-capture off has
   strictly less mating power, so "K+B vs K is a draw" becomes variant-dependent. This
   compounds the bishop-colour-parity finding already recorded in `draw-rules.md`.
4. **Perceptual load** — the UI must render the move set and the attack set as distinct,
   and non-visually as well (CLAUDE.md §7). *A move-only portal square that looks like a
   threat is a UX bug.*

## Cylinder chess and the boundary question

In cylinder chess a single bishop can give **double check** because its two diagonals
reconverge, and there are no corners for the king to hide in. Attacks wrap exactly as
moves do.

**No established variant was found that permits movement but not attack across a board
boundary.** Treat that as "no counterexample found", not proof of absence: the
*piece-level* precedent is abundant, so we are applying a known mechanism at a novel
level. Practical corroboration from cylinder implementations: **seam-crossing rays must
be length-capped or they loop forever** — the same trap round 1 found independently.

## Other configurable systems

- **XBoard/WinBoard family** — ini-configurable, XBetza as the piece language, and the
  only place an actual cylinder modifier (`o`) was found in a piece-description language.
- **Ludii** — games as *ludemes*, with a grammar **auto-generated from the class
  hierarchy**, giving "a guaranteed 1:1 mapping between the source code and the grammar".
  The transferable idea: *a rules DSL should be generated from the types, not maintained
  beside them.*
- **Zillions of Games** (1998) — maximum generality via a LISP-like DSL, and the
  cautionary tale: "the default AI player is quite naïve", unmaintained since 2003.
  Generality bought breadth at the cost of strength.
- **Musketeer Chess** — the opposite pole: a curated catalogue rather than a rule
  language. Cheap to implement and balance, no combinatorial blowup.

## Flagged as unverified

- XBetza composing `o` with `m`/`c`.
- Fairy-Stockfish wrap-around support (searched, not found).
- Ultima's immobiliser/checkmate anomalies come from encyclopedic mirrors; the primary
  sources are themselves inconsistent.
- chessvariants.com blocks automated fetch — worth a manual read before committing spec
  text that cites it.

## Sources

- FIDE Laws of Chess, Article 3 — https://handbook.fide.com/chapter/e012023
- Betza's funny notation — https://en.wikipedia.org/wiki/Betza%27s_funny_notation
- Extended Betza notation, GNU XBoard (the `o` modifier) — https://www.gnu.org/software/xboard/Betza.html
- Fairy-Stockfish `variants.ini` — https://raw.githubusercontent.com/fairy-stockfish/Fairy-Stockfish/master/src/variants.ini
- Fairy-Stockfish `piece.h` (`MoveModality`) — https://raw.githubusercontent.com/fairy-stockfish/Fairy-Stockfish/master/src/piece.h
- Fairy-Stockfish `bitboard.h` (`attacks_bb` vs `moves_bb`) — https://raw.githubusercontent.com/fairy-stockfish/Fairy-Stockfish/master/src/bitboard.h
- Fairy-Stockfish variant configuration wiki — https://github.com/fairy-stockfish/Fairy-Stockfish/wiki/Variant-configuration
- Ultima — https://en.wikibooks.org/wiki/Chess_Variants/Ultima · https://en.wikipedia.org/wiki/Baroque_chess
- Patrol chess — https://en.wikipedia.org/wiki/Patrol_chess
- Berolina pawn — https://en.wikipedia.org/wiki/Berolina_pawn
- Empire Chess — https://www.pychess.org/variants/empire · Orda Chess — https://www.pychess.org/variants/orda
- Cylinder chess — https://en.wikipedia.org/wiki/Cylinder_chess · https://www.gnu.org/software/xboard/whats_new/rules/Cylinder.html
- Ludii — https://arxiv.org/abs/1905.05013
- Zillions of Games ZRF reference — https://courses.cs.duke.edu/spring06/cps108/Assignments/06_vooga/zrf.pdf
- Bishop (Dart variant-chess library) — https://github.com/alexobviously/bishop
