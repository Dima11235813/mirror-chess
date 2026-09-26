# Epic — An AI opponent

An engine the owner can actually play against, under the current rules.

Kept separate from the [balance epic](../balance/README.md) on purpose: that epic
needs *throughput* (64,000 games), this one needs *latency and feel* (one good move in
about a second). They share a search core and diverge after that.

---

## 1. What is actually hard here — measured, not guessed

Before planning, two things were measured against the real engine on 2026-07-31.
Both moved the plan.

### 1.1 Speed is **not** the problem

Perft from the opening position, current pure-TS generator, with full legality
filtering and a fresh board allocated per move:

| Depth | Nodes | Time | Rate |
| --- | --- | --- | --- |
| 3 | 9,852 | 52 ms | ~188k/s |
| 4 | 238,060 | 956 ms | ~249k/s |

~250k positions/second is slow for a chess engine but **ample for a casual
opponent**. With alpha-beta and decent move ordering the effective branching factor
falls from ~22 to ~6, so depth 6 is roughly 45k nodes — well under a second even after
paying for evaluation. Depth 7–8 becomes a matter of patience.

**Conclusion: the opponent does not need the performance project.** It can be built on
the existing generator today. The perf work in
[`../balance/search-engine.md`](../balance/search-engine.md) is required for the
*study*, not for playing a game. This is the opposite of what we assumed.

For reference, mirror rules cost about 21% more nodes than ordinary chess at depth 4
(238,060 vs chess's 197,281) — the seam widens the tree, but not alarmingly.

### 1.2 Evaluation is the problem, and it is worse than "the numbers need tuning"

Standard chess evaluation rests on assumptions the seam **invalidates outright**.
Measured attack counts on an empty board:

| Piece | Centre (`d4`) | Edge (`a4`) | Chess centre | Chess edge |
| --- | --- | --- | --- | --- |
| Bishop | 17 | **15** | 13 | 7 |
| Knight | 8 | **8** | 8 | 4 |
| Rook | 14 | 14 | 14 | 14 |
| Queen | 31 | **28** | 27 | 21 |

Three consequences, each of which breaks a load-bearing piece of every chess engine:

1. **Piece-square tables are largely invalid.** They exist to encode "centralise your
   pieces", which works because edge squares are bad. Here a knight attacks **8
   squares from a4, exactly as many as from d4** — "a knight on the rim is dim" is
   simply false in this game. An engine carrying chess PSTs will herd its pieces to
   the centre for no reason.

2. **Bishops are not colour-bound.** Every seam hop flips square colour — the parity
   of `f + r` changes by `7 - 2f`, which is always odd. Verified by flood fill: **a
   lone bishop starting on `a4` can reach all 64 squares.** So the bishop-pair bonus
   is close to meaningless, opposite-coloured-bishop endgames are not drawish, and
   `K+B vs K+B` insufficient-material logic must be re-derived (already flagged in
   [`../rules/draw-rules.md`](../rules/draw-rules.md) — now confirmed rather than
   suspected).

3. **Every rank is a cycle, not a line.** A rook on `d4` attacks `h4` both directly
   *and* the other way around through the seam. To shelter a king from a rook on its
   rank you must now block **both** directions. King safety inverts: the corner, the
   safest square in chess, is attackable along its rank from either side and cannot be
   walled off. **Castling into the corner may be actively bad here** — a hypothesis
   the engine will settle faster than we can by hand.

This is why the opponent is hard: not the search, the **priors**.

## 2. Approach: let the engine tell us what the pieces are worth

Because the standard priors are wrong, the plan deliberately avoids hand-authoring
them. Order of work:

1. **[`../engine/architecture.md`](../engine/architecture.md)** — the layering, types
   and documentation standard everything else is built inside. The engine is a
   teaching artifact in its own right (CLAUDE.md §12), so this comes first.
2. **[`../engine/engine-core.md`](../engine/engine-core.md)** — search that is correct
   under the mirror rules, with the *minimum* evaluation that can play a legal,
   non-embarrassing game: material plus mobility. Mobility is the key choice — it
   reflects a piece's extra portal moves automatically, without our guessing their
   value.
3. **[`../engine/evaluation.md`](../engine/evaluation.md)** — derive the real terms.
   Measure piece values by self-play rather than asserting them; test the PST,
   bishop-pair and king-safety hypotheses above; only then hand-write anything.
4. **[`opponent-integration.md`](./opponent-integration.md)** — a Web Worker, difficulty
   levels that degrade gracefully, and the UI to play a game.

Stage 2 is playable. Stages 3–4 make it good.

The search and evaluation live in the [engine epic](../engine/README.md) because they
are shared with the [variant study](../balance/README.md); this epic owns everything
about a *person* playing against them.

## 3. Prerequisites

- **Promotion** (spec §8.4) — without it a pawn reaching the last rank simply stops,
  and every endgame is nonsense. The single most important missing rule for an
  opponent.
- **Draw rules** ([`../rules/draw-rules.md`](../rules/draw-rules.md)) — otherwise a
  won-but-not-converted game shuffles forever and the engine cannot recognise a draw.
- **Rule flags** ([`../balance/rule-flags.md`](../balance/rule-flags.md)) — *not*
  blocking, but the engine should read the ruleset from `GameState` from day one
  rather than being retrofitted later.

Castling and en passant matter less; the engine will play sensibly without them.

## 4. What "good opponent" means here

Not "strong". An opponent that crushes the owner every game teaches nothing about the
variant. The target is an engine that:

- plays legally and never hangs the UI;
- is **beatable at low difficulty and clearly better at high**;
- degrades in strength *gracefully* — a weak setting should play simply, not blunder
  at random (see [`opponent-integration.md`](./opponent-integration.md) §3);
- and above all **uses the seam**, because an opponent that plays as if the portal did
  not exist is both weak and a poor teacher of the variant.

That last one is measurable: track the engine's portal-move share and compare it to
the share seen in self-play. An engine that never portals has a broken evaluation.
