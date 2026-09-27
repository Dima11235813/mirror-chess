import type { Color, Kind, MovePosition } from '@game/types'
import { legalMovesFor } from '@game/moves'
import { portalEnabled } from '@game/rules'
import { type Centipawns, cp, PAWN_VALUE } from './types'

/**
 * EVALUATION — what a position is worth, and why.
 *
 * **What is this?** A function that looks at a position and returns a number: positive
 * means the side to move is better off. The search uses it at the leaves of its tree, so
 * it is the only place the engine has any *opinion* about chess. Everything else is
 * bookkeeping.
 *
 * **Why is it here?** Because search without evaluation just counts positions. It is also
 * the part of this engine that cannot be borrowed: search technique transfers between
 * chess variants almost unchanged, and evaluation does not transfer at all.
 *
 * **How does it work?** By default, **one term**: add up the pieces. A second — mobility,
 * how many legal moves each side has — is implemented and switched **off**, for a measured
 * reason given under "what is subtle" below.
 *
 * One term is not a placeholder. It is the design, and the omissions are the argument.
 *
 * **What does the mirror seam change about this? — the whole reason this file is short.**
 *
 * A normal engine's evaluation is mostly **geometry**: piece-square tables saying a knight
 * belongs in the centre, rules about rooks on open files, a bonus for the bishop pair, a
 * king-safety term about pawn shelters. Every one of those encodes an assumption the seam
 * breaks:
 *
 * - **Piece-square tables are near-meaningless.** A knight on `a4` attacks eight squares,
 *   exactly as many as one on `d4`. The centre is not special, because the edge is not a
 *   wall — it is a door.
 * - **The bishop pair is close to worthless.** A seam hop preserves rank and swaps file
 *   `f` for `7 - f`, and since `0` and `7` differ in parity the square colour *flips*. A
 *   lone bishop reaches all 64 squares, so "one of each colour" stops being a thing you
 *   can lack. It is worse than worthless as a term: `draw-rules.ts` proves a single
 *   bishop that captures across the seam is **mating material by itself**.
 * - **A rank is a cycle.** A rook attacks along it in both directions at once, and a
 *   king's rank cannot be walled off with one blocker — so pawn-shelter king safety, as
 *   chess understands it, does not apply.
 *
 * So this file starts **geometry-free on purpose**. Every one of those terms is a
 * *hypothesis to be tested* against self-play, not a fact to be ported
 * (`prj-mgmt/epics/engine/evaluation.md`). Adding a piece-square table here because "every
 * engine has one" would be the single easiest way to make this engine worse while
 * appearing to make it better.
 *
 * **What is subtle? — mobility is off by default, and the reason is measured.**
 *
 * Counting legal moves for both sides costs **567 µs** per evaluation on a middlegame
 * position; counting material costs **0.4 µs**. That is a factor of **1465**, and it is not
 * a rounding error in the search's budget — it *is* the budget. With quiescence enabled,
 * ~95% of all nodes are leaves, so leaf cost is search cost, and the engine ran at roughly
 * **1,000 nodes/second** with mobility on. Material-only takes it to hundreds of thousands.
 *
 * Depth beats evaluation sophistication by a wide margin at this stage: a material-only
 * search two plies deeper will out-play a mobility-aware one every time. So {@link evaluate}
 * defaults to material alone, and mobility is kept behind {@link EvalOptions} — implemented,
 * tested, and ready for the day it can be maintained *incrementally* (updated as moves are
 * made rather than recomputed per leaf), which is the only form in which it can ever be
 * affordable.
 *
 * (Measured 2026-08-05, Kiwipete, `2:bBrRqQnNkKP`. Pseudo-legal mobility — skipping the
 * self-check filter — costs 84 µs, still 210× material, so it is not the answer either.)
 *
 * This is a decision the variant study should eventually revisit with evidence rather than
 * argument: is a shallower mobility-aware engine really weaker? Nothing here can answer
 * that; a self-play match can.
 */

/** Which evaluation terms to include. */
export interface EvalOptions {
  /**
   * Include the mobility term. **Defaults to `false`** — see the module note; it costs
   * 1465× the material term and pays for itself only once it is incremental.
   */
  readonly mobility?: boolean
}

/**
 * Piece values, in centipawns.
 *
 * **Provenance: inherited from chess, and explicitly flagged for tuning.** These are the
 * conventional values every chess primer gives. They are almost certainly *wrong* for this
 * variant — a bishop that crosses the seam reaches every square on the board and can mate
 * alone, which is not a 330-centipawn piece — but a wrong number we can name beats a
 * guessed number we cannot.
 *
 * The plan is to **derive** them from self-play rather than assert them
 * (`prj-mgmt/epics/engine/evaluation.md`). Until then, treat every value below as a
 * placeholder with a citation, and expect the bishop's to move most.
 *
 * The king is zero: it is never captured, so its value never enters a material balance.
 * Giving it a large number is a common shortcut that breaks as soon as anything sums
 * material for a purpose other than comparison.
 */
export const PIECE_VALUES: Readonly<Record<Kind, Centipawns>> = {
  P: PAWN_VALUE,
  N: cp(320),
  B: cp(330),
  R: cp(500),
  Q: cp(900),
  K: cp(0),
}

/**
 * How much one legal move is worth.
 *
 * **Provenance: guessed, and flagged for tuning.** Small enough that mobility never
 * outweighs a pawn on its own — about a tenth of a pawn for ten extra moves — because a
 * term this crude should break ties, not decide games.
 */
export const MOBILITY_WEIGHT: Centipawns = cp(3)

/** One named component of a score, so a total can be explained rather than asserted. */
export interface EvalTerm {
  readonly name: string
  /** The term's contribution, already signed from the side to move's point of view. */
  readonly value: Centipawns
  /** What this term measured, before weighting — for display. */
  readonly detail: string
}

/**
 * A score together with the terms that produced it.
 *
 * The invariant that makes this worth having: **the terms sum to the total.** If they do
 * not, the explanation shown to a reader is a lie, and this epic exists precisely so that
 * the engine does not lie to its reader. `eval.test.ts` checks it.
 */
export interface EvalBreakdown {
  readonly total: Centipawns
  readonly terms: readonly EvalTerm[]
}

/**
 * Total material for one side.
 *
 * @param position Board and rules. Never mutated.
 * @param color Side to total.
 */
export function materialFor(position: MovePosition, color: Color): Centipawns {
  let total = 0
  for (const piece of position.board) {
    if (piece && piece.color === color) total += PIECE_VALUES[piece.kind]
  }
  return cp(total)
}

/**
 * The number of legal moves `color` has.
 *
 * Legal, not pseudo-legal: a pinned piece's "moves" are not mobility, and counting them
 * would reward being pinned. The cost is a self-check filter per move, which is most of
 * why this term is expensive.
 */
export function mobilityFor(position: MovePosition, color: Color): number {
  let count = 0
  for (let index = 0; index < 64; index++) {
    const piece = position.board[index]
    if (!piece || piece.color !== color) continue
    count += legalMovesFor(position, { f: index % 8, r: Math.floor(index / 8) }).length
  }
  return count
}

/**
 * Evaluate `position` from `sideToMove`'s point of view, with the reasoning attached.
 *
 * @param position Board and rules. Never mutated.
 * @param sideToMove Whose turn it is. The score's sign is relative to this side, which is
 *   what negamax requires.
 * @returns The total and the terms that sum to it.
 */
export function evaluateVerbose(
  position: MovePosition,
  sideToMove: Color,
  options: EvalOptions = {},
): EvalBreakdown {
  const them: Color = sideToMove === 'white' ? 'black' : 'white'

  const ourMaterial = materialFor(position, sideToMove)
  const theirMaterial = materialFor(position, them)

  const terms: EvalTerm[] = [
    {
      name: 'material',
      value: cp(ourMaterial - theirMaterial),
      detail: `${ourMaterial} vs ${theirMaterial}`,
    },
  ]

  if (options.mobility) {
    const ourMobility = mobilityFor(position, sideToMove)
    const theirMobility = mobilityFor(position, them)
    terms.push({
      name: 'mobility',
      value: cp((ourMobility - theirMobility) * MOBILITY_WEIGHT),
      detail: `${ourMobility} vs ${theirMobility} legal moves @ ${MOBILITY_WEIGHT}cp`,
    })
  }

  return { total: cp(terms.reduce((sum, term) => sum + term.value, 0)), terms }
}

/**
 * Evaluate `position` from `sideToMove`'s point of view.
 *
 * The hot-path form: identical arithmetic to {@link evaluateVerbose}, without building the
 * term objects. Keeping them as two functions rather than one that always builds the
 * breakdown is what makes "instrumentation compiles out with zero hot-path cost" true
 * rather than aspirational — the search never allocates a term it will not read.
 *
 * `eval.test.ts` pins the two together, because two implementations of one formula is
 * exactly the kind of duplication that drifts.
 */
export function evaluate(
  position: MovePosition,
  sideToMove: Color,
  options: EvalOptions = {},
): Centipawns {
  const them: Color = sideToMove === 'white' ? 'black' : 'white'
  let score = materialFor(position, sideToMove) - materialFor(position, them)
  if (options.mobility) {
    score += (mobilityFor(position, sideToMove) - mobilityFor(position, them)) * MOBILITY_WEIGHT
  }
  return cp(score)
}

/**
 * Does this ruleset make the inherited piece values especially suspect?
 *
 * Not used by the evaluation — it is a signal for the study and for anyone reading a
 * score and wondering how much to trust it. A bishop that crosses the seam is a
 * qualitatively different piece from a chess bishop, and `PIECE_VALUES.B` does not know
 * that yet.
 */
export function pieceValuesAreSuspect(position: MovePosition): boolean {
  return portalEnabled(position.rules, 'B')
}
