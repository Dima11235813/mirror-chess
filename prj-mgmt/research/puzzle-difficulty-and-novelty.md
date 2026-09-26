# Research — measuring puzzle difficulty and novelty

> 2026-09-26. Prior art read first-hand where the source was reachable; the two items
> marked **unread** are flagged rather than paraphrased. Everything in §3 was measured on
> our own committed set, not cited.

## The honest verdict, first

**Difficulty cannot be *predicted* to useful accuracy without human solve data, and nobody
has managed it.** The state of the art trains a transformer on **4.2 million** Lichess
puzzles carrying real Glicko-2 ratings and still lands at a mean absolute error of **258.7
rating points**, with 57.8% of predictions inside three rating deviations
([GlickFormer, arXiv:2410.11078](https://arxiv.org/html/2410.11078v1)). On a scale where
puzzles span roughly 400–3000, that is a wide band.

We have 161 puzzles, zero human attempts, and a variant nobody has ever played.

So the design follows from that, and it is the same shape as every other measurement
decision in this project:

> **Report transparent features and a coarse band. Never invent a rating.** Start logging
> solve attempts now, because that data cannot be collected retroactively, and calibrate
> against it when there is enough.

## 1. How everyone else does it

**Lichess — the ground truth the whole field uses.** Puzzle difficulty is a **Glicko-2**
rating, and each attempt is treated as a match between the player and the puzzle: solve it
and the player gains rating while the puzzle loses some. It is not computed from the
position at all. It is *measured from people*.

**Maia — the principled proxy, and the one we cannot have.**
([Maia, KDD 2020](https://www.cs.toronto.edu/~ashton/pubs/maia-kdd2020.pdf);
[Maia-2, NeurIPS 2024](https://www.cs.toronto.edu/~ashton/pubs/maia2-neurips2024.pdf))
Maia is a family of networks each trained on games from one rating band, predicting the
move a *human of that strength* plays — 46–52% top-1 accuracy, far above engines, because
it optimises for human behaviour rather than for winning. That yields the cleanest
definition of difficulty available:

```
difficulty(puzzle, level) = 1 − P(a human at that level plays the key move)
```

**It does not transfer to Mirror Chess.** Maia's power comes from millions of human games
in the game being modelled. There are no human Mirror Chess games. This is the single most
important finding here: the best method in the literature is unavailable to us for a reason
no amount of compute fixes.

**What the tactical literature says makes a puzzle hard**, consistently: a **quiet** key
move (no check, no capture) is hardest, because players search checks and captures first;
several plausible candidate moves force real calculation instead of pattern-matching; and
longer forced sequences are harder to hold in the head.

**Novelty has a formal treatment** worth borrowing — novelty search
([Lehman & Stanley; QD survey](https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2016.00040/full)).
Novelty is the mean distance from an item to its **k nearest neighbours** in an archive,
measured over a hand-chosen **behavioural descriptor**. That is exactly the tool for "is
this puzzle different from the 161 we already have", which is a different question from
"is this puzzle impossible in chess".

**Unread, flagged:** *Six dubious ways to estimate the difficulty of a chess puzzle*
(Zyśko, [slides](https://www.mimuw.edu.pl/media/uploads/seminars/six-dubious-ways-to-estimate-the-difficulty-of-a-chess-puzzle-presentat_K3mc0po.pdf))
and *Estimating the Puzzlingness of Chess Puzzles* — both PDFs that could not be extracted.
The title of the first suggests it catalogues exactly the failure modes below; read it
before finalising the score.

## 2. Two different things called "novelty"

Keeping these apart matters, because we currently measure only the first and it no longer
discriminates.

| | Question | Today | Use |
| --- | --- | --- | --- |
| **Novel vs chess** | Could this puzzle exist in ordinary chess? | binary `mateInChess: false` — **161 of 161 pass** | a *gate*: reject anything that fails |
| **Novel vs our own set** | Is this different from the puzzles we already have? | not measured | a *ranking*: choose what to keep and what to show next |

A gate that everything passes cannot rank anything. Both need grading.

## 3. What we measured on the 161 committed puzzles

### 3.1 Signals that actually vary

| Signal | Distribution | Verdict |
| --- | --- | --- |
| Key move is **quiet** (no check, no capture) | **58 (36%)** | **Best single feature.** Real variance, and the literature's strongest human signal |
| Key move is among the **forcing** moves | 103 (64%) | the complement of the above |
| **Forcing moves available** (checks + captures to reject) | min 1, median 14, max 37 | **Strong.** "How much noise must be searched through" |
| **Piece travel distance** | 1–7, median 3 | Useful; a piece arriving from far away is harder to see |
| Key move **crosses the seam** | 48 (30%) | variant-specific, and see the caveat in §5 |
| **Black replies** after the key move | 1–6, median **1** | Weak as written — see 3.2 |
| **Legal moves at root** | 30–36 for most | Weak: almost no variance |
| **Engine depth to find** | **3 for every puzzle but one** | **Dead.** See 3.2 |

### 3.2 Three findings that change the plan

**The engine-depth proxy is useless here, by construction.** A mate in two is found at
depth 3 and not at depth 2 — for every puzzle. The obvious "how deep must the engine search"
difficulty signal carries **no information** for a fixed-goal set. It would only start to
discriminate across *mixed* goals (mate in 2 versus 3 versus 4), which is an argument for
mining longer mates.

**The set is skewed easy, and this is a quality problem rather than a difficulty one.**

```
Black replies after the key move:   1 → 107 puzzles   (66%)
                                    2 →  48
                                    3 →   4
                                    4 →   1
                                    6 →   1
```

**Two-thirds of our "mate in 2" puzzles give Black exactly one legal move.** That is barely
a two-move puzzle: find the check, the reply is forced, mate. The miner should require a
minimum number of defences.

**The set is repetitive.** 161 puzzles cover **16 motifs** (material × key-move type × seam),
and the top four account for **115 of them (71%)**:

```
 33  KBB-KN | check | plain
 29  KQ-K   | quiet | plain
 28  KRB-KP | check | plain
 25  KBB-KN | check | seam
```

The most interesting combination — a **quiet** key move that **crosses the seam** — is just
**12 puzzles (7%)**. Those are the ones worth showing first, and we have no way to surface
them today.

### 3.3 Novelty versus chess, graded

| Tier | Count | Meaning |
| --- | --- | --- |
| The position is not even a game in chess (insufficient material) | **5** | strongest: the seam creates the possibility of winning at all |
| Live in chess, but no forced mate exists | 156 | the seam creates the *mate* |
| Live in chess and some mate exists | 0 | rejected by the gate, as intended |

Those 5 are the showcase puzzles — a lone bishop mating where chess would call it a dead
draw — and nothing in the format distinguishes them.

## 4. Proposed design

### 4.1 Difficulty: a transparent score, reported as a band

Not a rating. A small additive score over features with real variance, each labelled with
its provenance the way every constant in this repo is (CLAUDE.md §12):

| Feature | Weight | Provenance |
| --- | --- | --- |
| key move is quiet | large | **cited** — the literature's strongest signal |
| forcing moves to reject (log-scaled) | medium | **cited** — candidate-move load |
| piece travel distance | small | **guessed**, flagged for calibration |
| number of defences | medium | **measured** — our set is skewed; this separates real two-movers |
| key move crosses the seam | **reported separately, not summed** | see §5 |

Presented as **easy / medium / hard**, because three bands is all an uncalibrated score can
honestly support, and a band is falsifiable against solve data later.

### 4.2 Novelty: gate on chess, rank on diversity

- **Gate** (unchanged): reject anything that is also a mate in chess.
- **Grade** the chess-differential into the three tiers of §3.3, so the 5 showcase puzzles
  are findable.
- **Rank by diversity** using the novelty-search formulation: give each puzzle a descriptor
  (material signature, key-move type, seam use, travel distance, defence count, mating piece)
  and score it by mean distance to its k nearest neighbours in the set. Use it for two
  things: **selecting** which mined puzzles to keep, and **ordering** what a player sees so
  they do not meet the same motif four times running.

### 4.3 The only real calibration: start logging now

The puzzle screen should record each attempt — puzzle id, whether the first move was
correct, how many wrong moves preceded it, and time to solve. Local storage is enough to
begin with; the data is worthless later if it is not collected now. With even a few hundred
attempts we can check whether the bands *order* puzzles correctly, which is a far weaker and
far more honest claim than a rating.

## 5. The caveat that applies to all of it

**Seam difficulty is not stable difficulty.** A player meeting this variant for the first
time will find every seam move hard; after fifty puzzles they will look for seam moves
first. Quiet-move difficulty does not decay that way. So seam crossing is reported as a
**dimension** rather than folded into a difficulty constant — otherwise the score measures
unfamiliarity and then silently stops being true.

**And our features are chess intuitions applied to a variant that has falsified chess
intuitions repeatedly** — the bishop pair, piece-square tables, "king and minor cannot
mate", "en passant is a local rule". Treat every weight as a hypothesis awaiting the solve
data, not as knowledge.

## Sources

- [GlickFormer: Predicting Chess Puzzle Difficulty with Transformers (arXiv:2410.11078)](https://arxiv.org/html/2410.11078v1)
- [Aligning Superhuman AI with Human Behavior: Chess as a Model System (Maia, KDD 2020)](https://www.cs.toronto.edu/~ashton/pubs/maia-kdd2020.pdf)
- [Maia-2: A Unified Model for Human-AI Alignment in Chess (NeurIPS 2024)](https://www.cs.toronto.edu/~ashton/pubs/maia2-neurips2024.pdf)
- [IEEE BigData 2024 Cup: Predicting Chess Puzzle Difficulty](https://knowledgepit.ai/predicting-chess-puzzle-difficulty/)
- [Quality Diversity: A New Frontier for Evolutionary Computation](https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2016.00040/full)
- [Six dubious ways to estimate the difficulty of a chess puzzle (slides — unread)](https://www.mimuw.edu.pl/media/uploads/seminars/six-dubious-ways-to-estimate-the-difficulty-of-a-chess-puzzle-presentat_K3mc0po.pdf)
- [Estimating the Puzzlingness of Chess Puzzles (unread)](https://www.researchgate.net/publication/388088295_Estimating_the_Puzzlingness_of_Chess_Puzzles)
