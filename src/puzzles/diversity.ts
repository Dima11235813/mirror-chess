/**
 * DIVERSITY — how different is this puzzle from the ones we already have?
 *
 * **What is this?** The second of the two things called "novelty", and the one we were not
 * measuring. They are different questions and both matter:
 *
 * | | Question | Shape |
 * | --- | --- | --- |
 * | chess differential | could this puzzle exist in ordinary chess? | a **label** on each puzzle |
 * | **diversity (here)** | is this different from what we already have? | a **ranking** across the set |
 *
 * **Why is it here?** Because a mined library repeats itself and nobody notices. Measured
 * on the first 161 puzzles: **16 motifs, and the top four were 71% of the set** — 33 of
 * them were the same material with the same kind of key move. Automatic mining from
 * gameplay makes that worse, not better: ten thousand puzzles is ten thousand near-copies
 * of whatever motif is most common.
 *
 * **How does it work?** The standard novelty-search formulation (Lehman & Stanley; see
 * `prj-mgmt/research/puzzle-difficulty-and-novelty.md`): describe each item by a
 * **behavioural descriptor**, then score it by the **mean distance to its k nearest
 * neighbours**. A puzzle in a crowd of near-identical puzzles scores near zero; one in an
 * empty region of the space scores high.
 *
 * Two uses, and they pull in opposite directions on purpose:
 *
 * - **Selection** — when the library is full, keep the puzzles that fill empty regions.
 * - **Ordering** — show a player something unlike the last few, so four bishop mates in a
 *   row do not happen by accident.
 *
 * **What is subtle?** The descriptor *is* the definition of "different", so it is a design
 * decision rather than an implementation detail. Ours deliberately includes **how the
 * puzzle is solved** (quiet or forcing, seam or not, how far the piece travels) and not
 * just what is on the board: two positions with identical material can be the same puzzle
 * twice or two quite different ones, and it is the solution that decides which.
 */
import type { Puzzle } from './types'

/**
 * A puzzle as a point in a small space, each axis scaled to roughly 0..1.
 *
 * Scaling matters: an unscaled axis dominates the distance simply by having larger numbers,
 * which would silently make one feature the whole measure.
 */
export interface Descriptor {
  /** Which material, as a stable index — different material is a different puzzle shape. */
  readonly material: number
  /** 1 when the key move is quiet, 0 when it is forcing. */
  readonly quiet: number
  /** 1 when the key move crosses the seam. */
  readonly seam: number
  /** Defences left, scaled: 1 reply and 6 replies are very different puzzles. */
  readonly defences: number
  /** How far the piece travelled, scaled by the board. */
  readonly travel: number
  /** How long the mate takes, scaled. */
  readonly depth: number
}

/** Axis weights. **Guessed**, and the first thing to revisit if the ordering looks wrong. */
const WEIGHTS: Readonly<Record<keyof Descriptor, number>> = {
  material: 1,
  quiet: 1,
  seam: 1,
  defences: 0.75,
  travel: 0.5,
  depth: 1,
}

/** Stable numbering for material signatures, so "different material" is a real distance. */
function materialAxis(material: string, index: ReadonlyMap<string, number>): number {
  const position = index.get(material)
  return position === undefined ? 0 : position / Math.max(1, index.size - 1)
}

/** Build the material index once per set, so the axis is stable across a whole ranking. */
export function materialIndex(puzzles: readonly Puzzle[]): ReadonlyMap<string, number> {
  const names = [...new Set(puzzles.map(p => p.material))].sort()
  return new Map(names.map((name, i) => [name, i]))
}

/** Describe one puzzle. */
export function describe(puzzle: Puzzle, index: ReadonlyMap<string, number>): Descriptor {
  return {
    material: materialAxis(puzzle.material, index),
    quiet: puzzle.features.keyMoveQuiet ? 1 : 0,
    seam: puzzle.features.crossedSeam ? 1 : 0,
    defences: Math.min(1, (puzzle.features.defences - 1) / 5),
    travel: puzzle.features.travel / 7,
    depth: (puzzle.features.goalMoves - 2) / 2,
  }
}

/** Weighted Euclidean distance between two descriptors. */
export function distance(a: Descriptor, b: Descriptor): number {
  let sum = 0
  for (const axis of Object.keys(WEIGHTS) as (keyof Descriptor)[]) {
    const delta = (a[axis] - b[axis]) * WEIGHTS[axis]
    sum += delta * delta
  }
  return Math.sqrt(sum)
}

/** How many neighbours the novelty score averages over. **Guessed**; 15 is the usual default. */
const DEFAULT_K = 5

/**
 * Score every puzzle by how unlike its neighbours it is.
 *
 * @param puzzles The set to score against — the "archive", in novelty-search terms.
 * @param k How many nearest neighbours to average over.
 * @returns One score per puzzle, in the same order. A near-duplicate scores ~0.
 */
export function noveltyScores(puzzles: readonly Puzzle[], k: number = DEFAULT_K): number[] {
  const index = materialIndex(puzzles)
  const points = puzzles.map(p => describe(p, index))

  return points.map((point, i) => {
    const distances = points
      .map((other, j) => (i === j ? Number.POSITIVE_INFINITY : distance(point, other)))
      .sort((a, b) => a - b)
      .slice(0, Math.max(1, Math.min(k, points.length - 1)))

    const finite = distances.filter(Number.isFinite)
    return finite.length === 0 ? 0 : finite.reduce((a, b) => a + b, 0) / finite.length
  })
}

/**
 * Order a set so consecutive puzzles are unlike each other.
 *
 * Greedy farthest-point traversal: start from the most novel puzzle, then repeatedly take
 * whichever remaining puzzle is furthest from the one just taken. It is not an optimal tour
 * — that is a travelling-salesman problem and this is a play order — but it reliably breaks
 * up the runs of near-identical puzzles that a mined set is full of.
 *
 * @returns Indices into `puzzles`, in the order to show them.
 */
export function spreadOrder(puzzles: readonly Puzzle[]): number[] {
  if (puzzles.length <= 2) return puzzles.map((_p, i) => i)

  const index = materialIndex(puzzles)
  const points = puzzles.map(p => describe(p, index))
  const novelty = noveltyScores(puzzles)

  const remaining = new Set(points.map((_p, i) => i))
  let current = novelty.indexOf(Math.max(...novelty))
  const order = [current]
  remaining.delete(current)

  while (remaining.size > 0) {
    let best = -1
    let bestDistance = -1
    for (const candidate of remaining) {
      const d = distance(points[current]!, points[candidate]!)
      if (d > bestDistance) { bestDistance = d; best = candidate }
    }
    order.push(best)
    remaining.delete(best)
    current = best
  }

  return order
}
