# Story — Rank puzzles by difficulty and by how novel they are

> **Status: MOSTLY DONE (2026-09-26).** Difficulty bands (`src/puzzles/difficulty.ts`),
> diversity ranking and play order (`src/puzzles/diversity.ts`), and the chess differential
> as a graded label rather than a gate. What remains is the only part that needs people:
> calibrating the bands against real attempts → [`solve-logging.md`](./solve-logging.md).
> Part of the [puzzles epic](./README.md). Research:
> [`../../research/puzzle-difficulty-and-novelty.md`](../../research/puzzle-difficulty-and-novelty.md).

## Summary

As the owner, I want puzzles ranked by difficulty and by novelty, so that a library mined
automatically from gameplay can be ordered into something worth playing rather than an
undifferentiated pile.

## 1. Why this is needed now

Automatic mining makes the ranking problem urgent rather than nice to have. The 161-puzzle
set already shows both failure modes it has to fix, measured 2026-09-26:

- **Skewed easy.** 107 of 161 (66%) give Black exactly **one** legal reply — barely a
  two-move puzzle.
- **Repetitive.** 16 motifs cover the set; the top four are 71% of it. The most interesting
  combination, a quiet key move that crosses the seam, is **12 puzzles (7%)** and there is
  no way to find them.

Scale makes both worse: mining ten thousand puzzles from gameplay produces ten thousand
puzzles of which most are near-duplicates of an easy motif.

## 2. What the research settles

- **Do not predict a rating.** The state of the art manages MAE ≈ 259 Glicko points with
  4.2M labelled puzzles. With zero human attempts, a predicted rating would be fiction.
- **Maia-style human-move prediction — the principled method — does not transfer**, because
  it needs millions of human games in the variant being modelled and none exist.
- **The engine-depth proxy is dead for a fixed goal**: every mate-in-2 is found at depth 3
  and not at depth 2. It would only discriminate across mixed goals.
- **Quiet key moves and candidate-move load are the signals with both literature support
  and real variance in our data.**
- **Novelty has two meanings** and we measured only one. The chess-differential was a
  *gate* that 161 of 161 passed; it is now a graded *label* (§4.2). Diversity within the
  set — the *ranking* half — is still absent, and is the main thing left here.

## 3. Acceptance Criteria

- [x] Each puzzle record carries computed **difficulty features**, not just a score:
      quiet/forcing key move, forcing moves available, defences, travel distance, seam use.
- [x] A difficulty **band** (easy / medium / hard) derived from those features, with every
      weight labelled *cited*, *measured* or *guessed* (CLAUDE.md §12).
- [x] Seam crossing is reported as its **own dimension**, never folded into the band — it
      measures unfamiliarity, which decays as a player learns the variant (research §5).
      Tested directly: flipping `crossedSeam` must not move a band.
- [x] The chess-differential is **graded into four tiers**, so the puzzles that are not
      even a game in chess are findable — and so an ordinary tactic can say so.
- [x] A **diversity score** per puzzle: mean distance to its k nearest neighbours over a
      documented descriptor (`src/puzzles/diversity.ts`), and a **spread play order** so a
      player does not meet four copies of one motif in a row. The descriptor carries *how a
      puzzle is solved* — quiet or forcing, seam or not, defences, travel, depth — because
      two positions with identical material can be the same puzzle twice or two quite
      different ones, and the solution is what decides.
- [x] ~~The miner gains a minimum-defence criterion~~ **Amended by decision 1:** defences
      became a *difficulty feature* rather than a gate, because the project is exploratory
      and a thin library is worse than a mixed one.
- [x] Bands are **recomputed from the record**, never hand-edited: `puzzle-set.test.ts`
      re-derives features and band for a sample of the committed set and compares.
- [ ] The puzzle screen **logs attempts** → [`solve-logging.md`](./solve-logging.md).
- [ ] A test asserts the band ordering is *falsifiable* against recorded attempts. Blocked
      on the logging above; it may report "not enough data" but must not silently pass.

## 4. Decisions taken (owner, 2026-09-26)

**1. Keep the set; band the easy ones.** The project is exploratory, so a thin library is
worse than a mixed one. The minimum-defence count becomes a **difficulty feature**, not a
mining gate — the 107 one-defence puzzles are marked easy rather than deleted. Revisit the
gate if the library ever gets big enough that quality beats quantity.

**2. Mine mate in 3.** Two reasons, and the second is the important one:

- They are the more satisfying puzzles, and depth-to-solve becomes a live difficulty signal
  again once the set contains mixed goals (research §3.2).
- **Unpredictability is part of the appeal.** A player should not be able to tell which
  puzzles are seam puzzles before looking. → see §4.1, which this forces.

**3. Solve logging: yes, opted into, and deliberately unlinkable.** Google authentication
for accounts; gameplay telemetry pseudonymous and **not** joinable back to the Google
identity, by design rather than by policy. The account side may hold email and marketing
data; the gameplay side must not be able to reach it. Stated plainly during onboarding.
→ [`solve-logging.md`](./solve-logging.md)

### 4.1 What decision 2 forces: the chess-differential stops being a gate

Every puzzle in the committed set is impossible in chess, because the miner **rejects**
anything that is also a chess mate. That guarantee is exactly what makes the library
predictable: "this is Mirror Chess, so the seam must be involved somewhere" is true 161
times out of 161, and a player learns it in an evening.

Only *30%* have a key move that crosses the seam, so the surface question — "does the
answer cross?" — is already unpredictable. The deeper one is not, and it is the one worth
protecting: **does the seam matter here at all?**

So the differential must become a **label** rather than a gate, and the library must
contain ordinary chess tactics too. That is a reversal of a criterion we shipped, and it is
recorded here rather than quietly changed.

### 4.2 The mix, decided

**A mixed library, with the differential as a label** (owner, 2026-09-26). Ordinary chess
tactics belong in the set. A player must not be able to tell from the outside whether the
seam matters here — that uncertainty *is* the game.

What it costs, stated plainly: the guarantee that every puzzle is chess-impossible is gone,
so the reveal now says one of four things rather than always the same one. The strongest
cases are still findable, because the differential is graded rather than boolean:

| Label | What the reveal says |
| --- | --- |
| `dead-in-chess` | chess would not even call this a live game — insufficient material |
| `no-mate-in-chess` | chess has no forced mate here at all |
| `different-mate-in-chess` | chess mates too, but by a different move — the seam changes the answer |
| `same-mate-in-chess` | an ordinary tactic; not every puzzle here needs the seam |

## 5. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/puzzles/difficulty.test.ts` | each feature computed correctly on pinned positions; bands monotone in the features |
| Unit | `src/puzzles/diversity.test.ts` | k-NN novelty over the descriptor; a duplicate scores zero, a new motif scores high |
| Unit | `src/puzzles/puzzle-set.test.ts` | bands and tiers in the committed set re-derive from the position |
| Integration | `PuzzleScreen.spec.tsx` | the band and the seam tag are shown; an attempt is logged |

## Definition of done

A library that can be ordered by how hard a puzzle is and by how much it differs from what
the player has already seen — with every weight labelled, the seam kept separate, and a
path to real calibration open rather than a fabricated rating.
