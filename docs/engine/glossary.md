# Engine glossary

Terms the [guided tour](./README.md) uses, in plain language. Where a term means something
different here than in chess, that is called out — those are the interesting ones.

---

**Alpha-beta** — Negamax plus pruning. Carry a window `[alpha, beta]`; if a move scores at
or above `beta`, the opponent will never allow this position, so the remaining moves at
this node cannot change anything and are skipped. Same answer as plain negamax, far fewer
nodes. Roughly doubles reachable depth.

**Branching factor** — How many legal moves a typical position has; the base of the
exponential. About 35 in chess. **Higher here**, since portal moves are extra moves.

**Centipawn (cp)** — A hundredth of a pawn, the unit scores are expressed in. *A convention
here rather than a measurement*: the variant's piece values are meant to be derived from
self-play, and the pawn is a less stable yardstick when edge pawns are not weak.

**Cutoff** — The moment alpha-beta stops examining a node's remaining moves. What makes the
pruning worth having.

**Depth** — Plies still to search below the current node. Counts **down** to zero. Not the
same as ply — see below, and see `src/engine/types.ts`.

**Dead position** — A position where checkmate is impossible for either side no matter how
badly both play, so the game is drawn immediately. **The mirror changes which positions
qualify**: king and bishop against a lone king is dead in chess and *not* dead here, because
a bishop that can capture across the seam mates on its own.

**Evaluation** — The function scoring a position, from the side to move's point of view.
The only place an engine has an opinion; everything else is bookkeeping.

**FEN** — Forsyth–Edwards Notation: a position on one line. How the outside world writes
positions down, and how published test suites are distributed. **A FEN cannot express a
Mirror Chess ruleset** — it describes a placement only, so the ruleset travels beside it.

**Horizon effect** — Stopping the search mid-capture-sequence and evaluating a position
that is about to change violently. Quiescence search is the fix.

**Mate score** — A score meaning "forced mate", offset by distance from the root so a
faster mate scores higher. Storing it relative to the wrong reference point is the classic
transposition-table bug.

**Mobility** — How many legal moves a side has. A crude activity proxy, and here one of
only two evaluation terms.

**Negamax** — Minimax written once instead of twice, using the fact that chess is zero-sum:
`score(p) = max over moves of −score(p after move)`. Requires evaluation to be
point-of-view relative.

**Node** — One position visited by the search. Engine speed is quoted in nodes per second.

**Perft** — "Performance test": count the leaf positions at a fixed depth. The standard
proof that move generation is correct. **This project's unfair advantage**: with every
portal flag off the game *is* chess, so published perft numbers apply.

**Ply** — One half-move (one side moving once). As a search term: distance from the root,
counting **up**. Confusing `ply` with `depth` is the mistake everyone makes once.

**Portal / seam** — This variant's one rule. The `a`- and `h`-files are linked at equal
rank. Sliders cross *by transit* (a ray reaches an empty edge square and continues on the
far side at the same rank); steppers cross *by wrapping the file* of their landing square.
Two different crossings — conflating them is the biggest trap in the codebase.

**Principal variation (PV)** — The line the engine expects: its move, the reply it expects,
and so on. The most useful debugging output an engine produces; an illegal or absurd PV
reveals bugs a score never would.

**Pseudo-legal move** — A move that follows a piece's geometry but might leave its own king
attacked. Filtering those out yields the legal moves — and yields pins and check evasion
for free.

**Quiescence search** — After the main search runs out of depth, keep searching *captures
only* until the position settles. The cure for the horizon effect. **Expected to be one of
the two places the seam bites hardest**, since captures can arrive from across the board.

**Ruleset / flag** — Which pieces may cross the seam, and whether they may *move* across,
*capture* across, or both. Six pieces × two rights, identified by a token like
`2:bBrRqQ-----`. All flags off is ordinary chess.

**SEE (static exchange evaluation)** — Estimating the outcome of a capture sequence on one
square without searching it. Used for move ordering. **Needs care here**, because the
attackers on a square can include pieces on the far side of the seam.

**Transposition** — Reaching the same position by different move orders. A transposition
table caches searched positions so the work is done once. **The trap here**: two different
rulesets give the same key for the same placement while having different legal moves, so a
shared table across rulesets is a silent correctness bug.

**Zobrist hash** — A position key maintained incrementally by XORing a random number per
piece-square, so making a move updates the key in a few operations rather than rehashing
the board.
