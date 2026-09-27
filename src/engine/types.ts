/**
 * ENGINE VOCABULARY — the numbers an engine deals in, given names the compiler enforces.
 *
 * **What is this?** Four quantities that every chess engine passes around, and that every
 * chess engine represents as a bare `number`: a score, how much deeper to search, how far
 * from the start of the search we are, and a count of positions visited.
 *
 * **Why is it here?** Because "it's a number" is how engines get their most embarrassing
 * bugs. A search function takes a depth, a ply, two scores and a node budget, and every
 * one of them is an `int`; swap two arguments and the code still compiles, still runs, and
 * quietly plays worse. The three that actually get confused are given distinct types here,
 * so swapping them is a compile error instead of a lost game.
 *
 * **How does it work?** *Branding*: an intersection with a unique phantom property that
 * exists only in the type system. `Centipawns` is a `number` at runtime — no wrapper, no
 * allocation, no cost — but it is not assignable to `Depth`, and a raw `number` is not
 * assignable to either. The constructors below are the only way in, which makes the
 * boundary explicit and greppable.
 *
 * **What is subtle?**
 *
 * `Depth` and `Ply` are the pair that confuses everyone, exactly once, and the bug is
 * hard to see because both are small non-negative integers that often coincide near the
 * root. They are opposites:
 *
 * ```
 *   root ──────────────────────────────────────────────► leaf
 *   ply    0      1      2      3                        (counts UP,   how far we came)
 *   depth  4      3      2      1      0                 (counts DOWN, how far to go)
 * ```
 *
 * They matter separately because they are used for different things. `depth` decides when
 * to stop. `ply` decides how a **mate score** is reported — a mate must be stored as
 * distance from the current node but compared as distance from the root, or the engine
 * prefers a mate in 5 to a mate in 3. That is the classic transposition-table trap
 * (`prj-mgmt/epics/engine/research/search.md`), and it is a `Depth`/`Ply` confusion
 * wearing a disguise.
 *
 * **What does the mirror seam change about this?** Nothing about the types — and one
 * thing about `Centipawns` that matters more than it looks. A centipawn is defined as a
 * hundredth of a *pawn*, which presumes the pawn is a stable unit of value. In this
 * variant that presumption is weaker than in chess: edge pawns are no longer weak, a lone
 * bishop can mate, and piece values are meant to be *derived* from self-play rather than
 * inherited (`prj-mgmt/epics/engine/evaluation.md`). The unit is kept because it is what
 * every engine, tool and human uses — but it is a convention here, not a measurement, and
 * `PAWN_VALUE` below says so.
 */

/**
 * A score in hundredths of a pawn, **from the side to move's point of view**.
 *
 * The point-of-view convention is not decoration: negamax depends on it. A position is
 * evaluated as "good for whoever is about to move", and the recursion negates on the way
 * up. An evaluation that returned "good for White" would break that symmetry silently.
 */
export type Centipawns = number & { readonly __brand: 'Centipawns' }

/** Plies still to search below this node. Counts **down** toward zero. */
export type Depth = number & { readonly __brand: 'Depth' }

/** Plies already searched, measured from the root. Counts **up** from zero. */
export type Ply = number & { readonly __brand: 'Ply' }

/** Positions visited. Plain: nobody has ever confused a node count with a score. */
export type NodeCount = number

/** Assert a number is a score. The only way to obtain a {@link Centipawns}. */
export const cp = (value: number): Centipawns => value as Centipawns

/** Assert a number is a remaining depth. The only way to obtain a {@link Depth}. */
export const depth = (value: number): Depth => value as Depth

/** Assert a number is a distance from the root. The only way to obtain a {@link Ply}. */
export const ply = (value: number): Ply => value as Ply

/**
 * The value of a pawn, and the definition of the unit.
 *
 * **Provenance: convention, not measurement.** 100 centipawns to the pawn is what every
 * engine and every human uses, so it is what we use. Unlike the other piece values it is
 * not a hypothesis to be tested — it is the scale the hypotheses are expressed in.
 */
export const PAWN_VALUE: Centipawns = cp(100)

/**
 * A score meaning "the side to move is being mated", offset by distance from the root.
 *
 * **Provenance: standard engine practice.** The magnitude must be far larger than any
 * material score so a mate always beats any amount of material, and far below the largest
 * safe integer so `-MATE` and arithmetic on it never overflow.
 *
 * Mate scores are stored as `MATE - ply`, so a mate found sooner scores *higher* and the
 * engine prefers the faster kill. Reading a mate score back out of a transposition table
 * requires re-basing it on the current ply — see the module note on `Depth` vs `Ply`.
 */
export const MATE_SCORE: Centipawns = cp(30_000)

/** A drawn position. Zero by definition, and named so the intent is visible at the call site. */
export const DRAW_SCORE: Centipawns = cp(0)

/**
 * The window bounds alpha-beta starts from: worse than any mate, better than any mate.
 *
 * Deliberately *outside* `±MATE_SCORE` rather than equal to it, so "no move was better
 * than the initial alpha" is distinguishable from "every move loses by force".
 */
export const INFINITE_SCORE: Centipawns = cp(31_000)

/** Is this score a forced mate rather than a positional judgement? */
export function isMateScore(score: Centipawns): boolean {
  return Math.abs(score) > MATE_SCORE - MAX_PLY
}

/**
 * The deepest the search may ever go.
 *
 * **Provenance: standard engine practice**, and a safety bound rather than a tuning knob.
 * It caps recursion so a quiescence-search explosion terminates instead of blowing the
 * stack, and it is the margin {@link isMateScore} uses to tell a mate score from a very
 * large positional one.
 */
export const MAX_PLY = 128

/**
 * Moves to mate, from a mate score. Positive when the side to move mates, negative when
 * it is mated. Returns `null` for a score that is not a mate.
 */
export function movesToMate(score: Centipawns): number | null {
  if (!isMateScore(score)) return null
  const plies = MATE_SCORE - Math.abs(score)
  const moves = Math.ceil(plies / 2)
  return score > 0 ? moves : -moves
}
