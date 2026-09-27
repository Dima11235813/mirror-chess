import { depth as asDepth, type Depth } from '../types'

/**
 * DIFFICULTY — how hard the engine tries.
 *
 * **What is this?** A named set of search limits. Each level is a depth ceiling and a time
 * budget; the engine deepens until it hits one of them.
 *
 * **Why is it here?** Because "the engine" is not a single opponent. A beginner wants
 * something they can beat; the study wants something reproducible; a strong player wants
 * it to think. One search, three answers.
 *
 * **How does it work? — by thinking less, never by playing badly.** The tempting way to
 * build an easy level is to make the engine blunder on purpose: pick a random move some
 * percentage of the time. That produces an opponent that plays well for twenty moves and
 * then hangs its queen for no reason, which is *infuriating* rather than easy — a human
 * cannot learn anything from an opponent whose mistakes have no pattern.
 *
 * Limiting depth degrades gracefully instead. A shallow search plays coherently; it simply
 * does not see as far, so it loses to tactics a deeper search would spot. That is what a
 * weaker human opponent actually feels like, and it is why every level here differs only in
 * how long it looks.
 *
 * **What does the mirror seam change about this?** The time budgets, and only them. The
 * seam widens the tree — measured at roughly 3× on a middlegame position with every flag
 * on — so a given depth costs meaningfully more than the same depth in chess. The budgets
 * below are set so that even the hardest level answers within a couple of seconds under the
 * *slowest* ruleset, rather than being tuned on ordinary chess and then feeling sluggish
 * exactly when the variant gets interesting.
 */

/** One named strength setting. */
export interface Difficulty {
  readonly id: DifficultyId
  readonly name: string
  /** Deepest iteration to attempt. Reached only if the time budget allows. */
  readonly maxDepth: Depth
  /**
   * Milliseconds the search may spend before it is asked to stop.
   *
   * A *soft* limit: the search checks it between nodes and finishes by discarding the
   * unfinished iteration, so the move returned is always from a completed one.
   */
  readonly budgetMs: number
  /** One line a player can use to choose. */
  readonly blurb: string
}

export type DifficultyId = 'gentle' | 'steady' | 'sharp'

/**
 * The levels, easiest first.
 *
 * **Provenance: measured, then rounded.** Depths chosen from the benchmark in
 * `prj-mgmt/epics/engine/architecture.md`: on a dense middlegame with every portal flag on,
 * this engine reaches depth 3 in ~0.3 s, depth 4 in ~1 s and depth 5 in ~8 s. Budgets are
 * set just above the depth each level targets, so the ceiling normally binds and the clock
 * is a backstop — which keeps play *deterministic* on a fast machine while still
 * guaranteeing a slow one answers promptly.
 */
export const DIFFICULTIES: readonly Difficulty[] = [
  {
    id: 'gentle',
    name: 'Gentle',
    maxDepth: asDepth(2),
    budgetMs: 400,
    blurb: 'Sees one move ahead. Will miss tactics.',
  },
  {
    id: 'steady',
    name: 'Steady',
    maxDepth: asDepth(4),
    budgetMs: 2_000,
    blurb: 'Sees short tactics and defends its pieces.',
  },
  {
    id: 'sharp',
    name: 'Sharp',
    maxDepth: asDepth(6),
    budgetMs: 6_000,
    blurb: 'Thinks longer and punishes loose play.',
  },
]

/** The level a new game starts on. */
export const DEFAULT_DIFFICULTY: DifficultyId = 'steady'

/** Look up a level, falling back to the default rather than throwing on bad input. */
export function difficultyById(id: string | null | undefined): Difficulty {
  return DIFFICULTIES.find(level => level.id === id)
    ?? DIFFICULTIES.find(level => level.id === DEFAULT_DIFFICULTY)!
}
