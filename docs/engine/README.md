# A guided tour of the Mirror Chess engine

This is a walkthrough of how a chess engine works, in **reading order** rather than
alphabetical order, using this engine as the text. Each section is short and points at
real code — the code is the material, this page is the map.

Every section ends with **what the mirror seam changes here**, which is the part you will
not find in any other engine tutorial. Mirror Chess is chess plus one rule: the `a`- and
`h`-files are linked, so pieces can move off one edge of the board and arrive at the other.
That single change ripples through almost everything below, and watching it ripple is a
good way to learn which parts of an engine are *chess* and which parts are *search*.

New to the vocabulary? Start with the [glossary](./glossary.md).

> **Status.** Sections 1–10 describe code that exists. Section 11 lists what is still
> missing. Nothing here describes code that does not exist as though it did — if a section
> is speculative it says so in its heading.

---

## 0. The two implementations

Before anything else, one structural decision explains a lot of what follows
([ADR 0002](../../prj-mgmt/epics/engine/adr/0002-two-implementations-one-oracle.md)):

| | `src/game/*` | `src/engine/*` |
| --- | --- | --- |
| Job | be **obviously correct** | be **fast and strong** |
| Style | pure, spec-shaped, never optimised | may be clever |
| Role | the oracle everything is checked against | the thing being checked |

The reference implementation is never optimised and never deleted. When the engine gets a
clever trick, the trick is proved by comparing it against the obvious version. You will see
this pattern three times in this tour, and it is the single most useful habit in the
codebase.

---

## 1. Representing a position

**Code:** [`src/game/types.ts`](../../src/game/types.ts), [`src/game/coord.ts`](../../src/game/coord.ts)

A board is a flat array of 64 squares, each holding a piece or nothing. A square is
`{ f, r }` — file and rank, both `0..7` — and `toIndex` flattens it to `r * 8 + f`.

The interesting part is that there are **three** contracts, not one, and the split is the
same one FEN makes:

| Type | Adds | Answers |
| --- | --- | --- |
| `Position` | board, rules | what attacks what |
| `MovePosition` | castling rights, en-passant square | what moves exist |
| `GameState` | turn, clock, repetition history | how the game stands |

This matters more than it looks. Attack detection genuinely cannot see castling rights, so
a whole class of bug is unwritable. And search sees `MovePosition` but never `GameState`,
so the draw rules cannot leak into a node count — which is exactly the bug that makes a
perft number wrong (see §3).

**What the seam changes here:** nothing. A position is a position. Everything the seam
does happens in the next section.

---

## 2. Generating moves

**Code:** [`src/game/moves.ts`](../../src/game/moves.ts), [`src/game/rays.ts`](../../src/game/rays.ts), [`src/game/attacks.ts`](../../src/game/attacks.ts)

Given a position, which moves are legal? Two steps:

1. **Pseudo-legal generation** — walk each piece's geometry. Sliders (bishop, rook, queen)
   walk rays until something blocks them; steppers (knight, king, pawn) apply fixed offsets.
2. **Legality filtering** — drop any move that leaves your own king attacked. This engine
   does it the simple way: make the move on a copy and ask "is my king attacked now?" That
   is slower than the clever alternative (tracking pins directly) and much harder to get
   wrong, which is the right trade for a reference implementation.

Pins, check evasion and the rule that you cannot castle out of check all fall out of step 2
rather than being written separately. That is worth noticing: a surprising amount of chess
is *emergent* from "you may not leave your king attacked".

**What the seam changes here — this is where it all lives.** There are two different
crossings, and conflating them is the single biggest trap in this codebase:

- **Sliders cross by transit** (spec §4). A bishop's ray reaches an empty edge square,
  hops *horizontally* to the mirrored file at the **same rank**, and keeps going in the
  same direction. A bishop leaving `a4` emerges at `h4`, not `h5`.
- **Steppers cross by wrapping the file** (spec §11). A knight on `a3` reaches
  `h5, g4, g2, h1` — its file wraps, its rank is whatever its own L-shape says.

And each piece holds **two independent rights**: may it *move* across the seam, and may it
*capture* across it? Six pieces × two rights is a family of games, not one game — which is
why the code reads a `RuleSet` and never assumes.

---

## 3. Proving move generation correct: perft

**Code:** [`src/game/perft.ts`](../../src/game/perft.ts), [`src/game/perft.test.ts`](../../src/game/perft.test.ts)

*Perft* ("performance test") counts the leaf positions at a fixed depth. It is the standard
correctness tool for engines, and it is unusually powerful: a single wrong number means a
single wrong rule, somewhere, and `perftDivide` bisects it down to the exact move.

The trick this project gets for free: **with every portal flag off, Mirror Chess is
ordinary chess**, whose perft numbers are published and independently reproduced by dozens
of engines. So a variant nobody else has ever implemented can still be checked against an
outside authority:

| Position | Depth | Nodes |
| --- | --- | --- |
| Start | 5 | 4,865,609 |
| Kiwipete | 4 | 4,085,603 |
| Position 3 | 5 | 674,624 |
| Position 5 | 4 | 2,103,487 |

All match. Getting a variant right is a matter of opinion until you can configure it back
into a game that isn't.

**Two traps worth knowing.** Perft counts *leaves*, so a node that stopped early because
the fifty-move clock expired would undercount — the draw rules must never reach it, which
is what the `MovePosition` / `GameState` split in §1 guarantees. And a promotion is **four**
moves, not one; collapsing them is the classic undercount.

**What the seam changes here:** it widens the tree by roughly 10% at depth 3 — 8,902
positions under ordinary chess, 9,690 with sliders crossing, 9,852 with everything
crossing. And for the variant itself there is no external oracle, so those numbers are
*regression baselines*: pinned on the day the generator was verified against published
chess, and any change to them is a change to the rules.

---

## 4. Vocabulary: the numbers an engine confuses

**Code:** [`src/engine/types.ts`](../../src/engine/types.ts)

Engines are full of bare integers that mean wildly different things, and two of them get
confused by everyone exactly once:

```
  root ──────────────────────────────────────────► leaf
  ply    0      1      2      3            (counts UP,   how far we came)
  depth  4      3      2      1      0     (counts DOWN, how far to go)
```

`Depth` decides when to stop. `Ply` decides how a **mate score** is reported — a mate must
be stored as distance from the current node but compared as distance from the root, or the
engine prefers a mate in five to a mate in three. Here they are distinct branded types, so
swapping them is a compile error rather than a lost game.

**What the seam changes here:** one assumption inside the word *centipawn*. A centipawn is
a hundredth of a pawn, which presumes the pawn is a stable unit of value. In this variant
that is weaker than in chess — edge pawns are no longer weak, and a lone bishop can mate.
The unit is kept because everyone uses it, but here it is a convention, not a measurement.

---

## 5. Evaluation: what is this position worth?

**Code:** [`src/engine/eval.ts`](../../src/engine/eval.ts)

The only place the engine has an *opinion*. Everything else is bookkeeping. Two terms:

1. **Material** — add up the pieces. Boring, and overwhelmingly the most important thing.
2. **Mobility** — count legal moves. A crude proxy for activity.

That is all, and **the omission is the design**.

**What the seam changes here — this is the most important section in the tour.**

A normal engine's evaluation is mostly *geometry*: piece-square tables saying a knight
belongs in the centre, a bonus for the bishop pair, king safety measured by pawn shelter.
Every one of those encodes an assumption the seam breaks:

- **Piece-square tables are near-meaningless.** A knight on `a4` attacks eight squares,
  exactly as many as one on `d4`. The edge is not a wall; it is a door.
- **The bishop pair is close to worthless.** A seam hop flips square colour, so a lone
  bishop reaches all 64 squares. Worse than worthless, in fact: a bishop that can capture
  across the seam is **mating material by itself** — `Ka1, Bd4` mates a lone `Kh8`, which
  is impossible in chess. That was proved by exhaustive enumeration, not assumed
  ([`draw-rules.md`](../../prj-mgmt/epics/rules/draw-rules.md)).
- **A rank is a cycle.** A rook attacks along it both ways at once, and a king's rank
  cannot be walled off with one blocker.

So evaluation starts **geometry-free on purpose**. Every inherited chess term is a
*hypothesis to be tested* against self-play, not a fact to port. Adding a piece-square
table because "every engine has one" is the easiest available way to make this engine
worse while appearing to improve it.

Evaluation can also explain itself: `evaluateVerbose` returns the terms, and a test asserts
they sum to the total. If the parts do not sum to the whole, the explanation shown to a
reader is a lie.

---

## 6. Search: minimax, negamax, alpha-beta

**Code:** [`src/engine/search.ts`](../../src/engine/search.ts)

Evaluation alone plays terribly — it cannot see that the queen it just won is recaptured
next move. Depth is what turns a static opinion into a plan.

**Negamax** is minimax with one observation that halves the code. Chess is zero-sum, so
what is good for me is exactly as bad for you. Evaluate every position *from the side to
move's point of view* and negate on the way up:

```
  score(position) = max over moves of  −score(position after move)
```

That one line is the whole algorithm, and `negamax()` is it written literally.

**Alpha-beta** is negamax plus one refusal to waste time. Carry a window `[alpha, beta]`:
alpha is the best I have already proved I can get, beta is the best my opponent will
allow. If a move scores `>= beta`, my opponent will never let me reach this position, so
the remaining moves cannot matter — stop. That *cutoff* turns `b^d` into roughly `b^(d/2)`:
about twice the depth for the same time.

**The habit from §0, applied.** Alpha-beta is an *optimisation*, and an optimisation that
changes the answer is a bug no amount of playing strength hides. So both are implemented,
and a test asserts they return the same score **and** choose the same move. The duplication
is the point.

**What the seam changes here — less than you would expect, and that is the lesson.**
Search is pure bookkeeping over "what moves exist" and "what is a position worth". It asks
the rules those questions and never answers them itself, so the seam reaches it only
through the answers: the tree is ~10% wider, and mates are rarer because kings wrap the
seam and are hard to corner. The *algorithm* is untouched. That is a real insight about
where the chess lives in a chess engine.

---

## 7. Move ordering

**Code:** [`src/engine/ordering.ts`](../../src/engine/ordering.ts)

Alpha-beta's power depends *entirely* on trying good moves first. With perfect ordering it
searches about `b^(d/2)` nodes; with reverse ordering it searches all `b^d` and the pruning
bought nothing at all. Same algorithm, same answer, quadratically different cost — decided
by the order of a loop. It is the cheapest large speedup an engine has.

Three heuristics, cheapest first: the **previous iteration's best move** (iterative
deepening keeps it for free), then **MVV-LVA** — most valuable victim, least valuable
attacker, because taking a queen with a pawn is the best kind of capture — then promotions,
then everything else.

Ordering must never change the *answer*, only the cost, and the equivalence test from §6
runs with it both on and off to prove exactly that.

**What the seam changes here:** two things. There are more captures to rank, so ordering
matters *more* here, not less. And the victim of an en-passant capture is not on the
destination square — across the seam it is not even on an adjacent file — so ordering asks
`capturedSquare()` rather than reading `board[to]`, which would silently rank every seam
en passant as a quiet move.

---

## 8. Quiescence search

**Code:** `quiescence()` in [`src/engine/search.ts`](../../src/engine/search.ts)

Stopping at a fixed depth means sometimes stopping *in the middle of a capture sequence* —
right after `QxP`, before `PxQ` — and reporting a won pawn when the truth is a lost queen.
That is the **horizon effect**, and it makes a fixed-depth engine tactically blind exactly
where tactics decide games.

The fix: at the leaves, keep searching, but only *forcing* moves — captures and promotions.
Those sequences end quickly because material runs out. Before searching anything, take the
static evaluation as a floor (the **stand-pat**): you are never obliged to capture, so you
can always decline.

**The one thing you must not get wrong:** you may not stand pat while **in check**.
Declining to move is not an option when the king is attacked, so a checked node generates
*every* legal move and uses no floor.

**What the seam changes here — measured, and it is the largest effect in this engine.**
On a dense middlegame position, quiescence is **80% of all nodes under ordinary chess and
94% under the full mirror ruleset**, and the whole tree is about **3× larger**. Quiescence
explosion is a real risk here rather than a theoretical one, which is why `quiescenceNodes`
is reported separately.

That measurement drove the two performance decisions in this engine:

- **Evaluation is material-only by default.** Counting legal moves for both sides costs
  **1465×** what counting material does — 567 µs against 0.4 µs. With ~95% of nodes being
  leaves, leaf cost *is* search cost, and the engine ran at roughly 1,000 nodes/second with
  mobility switched on. Depth beats evaluation sophistication by a wide margin, so mobility
  waits for an incremental implementation.
- **Quiescence generates forcing moves directly**, instead of generating every legal move
  and filtering. The legality filter is the expensive part, and running it on the four
  captures rather than the forty moves — at nodes that are 80–95% of the whole search —
  made the engine **11–14× faster**. The honest cost is recorded in the code: because the
  full legal list is never built, a *stalemate* deep inside a line is scored by standing pat
  rather than as a draw.

---

## 9. Transposition tables *(not built yet)*

The same position often arises by different move orders — hence *transposition* — so a
cache of already-searched positions avoids redoing the work. Keyed by a Zobrist hash.

**What the seam will change here — a trap that is ours alone.** Two different rulesets
produce the *same* position key for the same piece placement, while having *different*
legal moves. Sharing one table across rulesets would be a silent correctness bug. The key
must be salted with the flag set, or the table instanced per ruleset. The same trap already
exists in miniature in [`position-key.ts`](../../src/game/position-key.ts), which
deliberately excludes the ruleset and says why.

---

## 10. The host: time, threads, and playing against it

**Code:** [`src/engine/host/`](../../src/engine/host/)

Everything above is pure and deterministic: same position, same ruleset, same depth, same
move. That is what makes a self-play study reproducible and a bug reducible to a single test
case — and it is lost by accident, one `Date.now()` at a time. So clocks, threads and I/O
live in exactly one layer, and a
[boundary checker](../../scripts/check-layer-boundaries.js) enforces that rather than
hoping for it.

Three pieces:

- **[`worker.ts`](../../src/engine/host/worker.ts)** — the search runs on a Web Worker. A
  search is a tight loop running for seconds and a page has one thread: run it there and the
  board stops redrawing while the engine works perfectly. This is the only file in the
  engine allowed to read a clock, and it injects the time budget *into* the search as a
  `shouldStop` callback rather than letting the search reach for one itself.
- **[`engine-client.ts`](../../src/engine/host/engine-client.ts)** — the page's half. Every
  request carries an id and every reply is checked against it, so a move computed for a
  position the player has since reset or reloaded can never be applied to the board.
- **[`levels.ts`](../../src/engine/host/levels.ts)** — difficulty, implemented as *thinking
  less* and never as playing badly on purpose. A random-blunder easy mode produces an
  opponent that plays well for twenty moves and then hangs its queen, which is infuriating
  rather than easy; a shallower search plays coherently and simply does not see as far.

**A consequence worth stating:** a search bounded by *time* is not deterministic across
machines, because a faster computer reaches a deeper iteration. That is fine for play and
unacceptable for the variant study, which must bound by depth alone. The two limits exist
separately for exactly that reason.

---

## 11. What is still missing

- **A transposition table** (§9), with the ruleset-salting trap it carries.
- **Killer moves and history heuristics** — more cheap ordering wins.
- **PVS** — a narrower window once a good move is found.
- **A faster board.** The reference implementation copies the board and re-scans for
  attacks on every legality test, which is why a node costs ~300 µs and why the search runs
  at tens of thousands of nodes per second rather than millions. Make/unmake and attack
  tables are roadmap item 7; the reference stays as the oracle they are checked against.
- **Measured piece values.** The current ones are inherited from chess and known to be wrong
  here — a bishop that crosses the seam can mate on its own.

---

## Where to go next

- The rules themselves: [`mirror-portal-spec.md`](../../prj-mgmt/epics/rules/mirror-portal-spec.md)
- Why the engine is built this way: [the engine epic](../../prj-mgmt/epics/engine/README.md)
- Named patterns used throughout: [`docs/design-patterns/`](../design-patterns/README.md)
- The experiment the engine exists to run: [the balance epic](../../prj-mgmt/epics/balance/README.md)
