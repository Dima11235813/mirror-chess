import type { GameState, Move } from '@game/types'
import { advancePosition } from '@game/advance'
import { isInCheck } from '@game/attacks'
import { allLegalMoves } from '@game/status'
import { pseudoLegalMovesFor } from '@game/moves'
import { applyMoveToBoard } from '@game/board'
import { isInsufficientMaterial } from '@game/draw-rules'
import { evaluate } from './eval'
import { isForcing, orderMoves } from './ordering'
import {
  DRAW_SCORE,
  INFINITE_SCORE,
  MATE_SCORE,
  MAX_PLY,
  type Centipawns,
  type Depth,
  type NodeCount,
  type Ply,
  cp,
  depth as asDepth,
  ply as asPly,
} from './types'

/**
 * SEARCH — choosing a move by looking ahead.
 *
 * **What is this?** The part that plays chess. It walks the tree of possible
 * continuations, scores the leaves with `eval.ts`, and reports the move that leads to the
 * best outcome *assuming the opponent also plays well*.
 *
 * **Why is it here?** Because evaluation alone plays terribly: it cannot see that the
 * queen it just won is recaptured next move. Depth is what turns a static opinion into a
 * plan.
 *
 * **How does it work?** Four ideas, each layered on the last:
 *
 * 1. **Negamax.** Minimax with one observation that halves the code: chess is zero-sum, so
 *    what is good for me is exactly as bad for you. Evaluate every position *from the side
 *    to move's point of view* and negate on the way up —
 *    `score(p) = max over moves of −score(p after move)`. {@link negamax} is that line,
 *    written literally.
 * 2. **Alpha-beta.** Negamax plus one refusal to waste time. Carry a window
 *    `[alpha, beta]`; a move scoring `>= beta` means the opponent will never allow this
 *    position, so the remaining moves cannot matter. Turns `b^d` into roughly `b^(d/2)`.
 * 3. **Move ordering** (`ordering.ts`). Alpha-beta only pays off if good moves are tried
 *    first, so the loop is sorted before it is walked.
 * 4. **Iterative deepening.** Search depth 1, then 2, then 3, keeping the best move from
 *    each pass to try first in the next. Sounds wasteful — it re-searches everything — but
 *    the tree grows exponentially, so all previous depths together cost a fraction of the
 *    current one, and the ordering hint they provide more than pays for them. It is also
 *    what makes the search *interruptible*, which is what makes time management possible.
 * 5. **Quiescence** (see {@link quiescence}). The cure for the horizon effect.
 *
 * **What is subtle? — which of these may change the answer.**
 *
 * Ideas 2, 3 and 4 are **value-preserving**: they reorder or skip work whose result is
 * provably irrelevant, so the score is identical to plain negamax. That is not a hope, it
 * is a test — {@link negamax} exists solely so {@link alphaBeta} can be checked against it,
 * with ordering on *and* off (ADR 0002's habit, applied inside the engine).
 *
 * Idea 5 **deliberately changes the answer**, because it is supposed to: quiescence exists
 * to return a *better* score than the fixed-depth one. So the equivalence test runs with
 * quiescence switched off, which is exactly why it is a flag rather than a hard-coded
 * behaviour (`prj-mgmt/epics/engine/engine-core.md` §3a).
 *
 * **What does the mirror seam change about this? — less than you would expect, and that is
 * the lesson.** Search is bookkeeping over "what moves exist" and "what is a position
 * worth". It asks the rules those questions and never answers them itself. What reaches it:
 *
 * 1. **The tree is about 10% wider** — 8,902 positions at depth 3 under ordinary chess,
 *    9,852 with everything crossing.
 * 2. **Quiescence has more to do.** Captures arrive from across the board, so the forcing
 *    move list is longer and the risk of a quiescence explosion is real rather than
 *    theoretical. `SearchStats.quiescenceNodes` is tracked for exactly this reason.
 * 3. **Mates are rarer and later**, because kings wrap the seam and are hard to corner.
 *
 * **What is deliberately still missing?** A transposition table, killer moves, history
 * heuristics and PVS — all on the safe list and all additive. Anything that prunes
 * *before* evaluating a branch (null-move, late move reductions, futility) stays off until
 * piece values are measured rather than inherited.
 */

/** What the caller wants from a search. */
export interface SearchOptions {
  /** Deepest iteration to attempt. Iterative deepening runs `1..maxDepth`. */
  readonly maxDepth: Depth
  /**
   * Search captures and promotions past the depth limit until the position is quiet.
   * Defaults to `true`; switched off only to compare against plain negamax.
   */
  readonly quiescence?: boolean
  /** Order moves before searching them. Defaults to `true`; off only for testing. */
  readonly ordering?: boolean
  /**
   * Host-supplied abort signal, polled between nodes.
   *
   * Search never reads a clock itself — determinism is what makes a self-play result
   * reproducible and a bug reducible to one position and depth, and it is lost by
   * accident, one `Date.now()` at a time. Timing lives in `host/`, and
   * `scripts/check-layer-boundaries.js` enforces that rather than hoping for it.
   */
  readonly shouldStop?: () => boolean
  /** Called with each completed iteration, for a UI that shows the engine thinking. */
  readonly onIteration?: (result: SearchResult) => void
}

/** What a search found, and what it cost. */
export interface SearchResult {
  /** The move to play, or `null` when the position is already over. */
  readonly move: Move | null
  readonly score: Centipawns
  /**
   * The **principal variation**: the line the engine expects, starting with `move`.
   *
   * The single most useful debugging output an engine has. A PV containing an illegal or
   * absurd move reveals bugs a score alone never would, which is why `search.test.ts`
   * replays every one of them through the reducer.
   */
  readonly pv: readonly Move[]
  readonly nodes: NodeCount
  /** Of `nodes`, how many were in quiescence. A blow-up here is the seam's known risk. */
  readonly quiescenceNodes: NodeCount
  /** The deepest iteration that **completed**. An aborted iteration is discarded. */
  readonly depth: Depth
}

/** Mutable counters and the abort flag, threaded through one search. */
interface SearchContext {
  nodes: NodeCount
  quiescenceNodes: NodeCount
  aborted: boolean
  readonly quiescence: boolean
  readonly ordering: boolean
  readonly shouldStop: (() => boolean) | undefined
}

/** Poll the host's abort signal, but not on every single node. */
const STOP_CHECK_INTERVAL = 2048

function shouldAbort(context: SearchContext): boolean {
  if (context.aborted) return true
  if (!context.shouldStop) return false
  if (context.nodes % STOP_CHECK_INTERVAL !== 0) return false
  if (context.shouldStop()) context.aborted = true
  return context.aborted
}

/**
 * Choose a move, deepening until `maxDepth` or until the host says stop.
 *
 * Deterministic whenever `shouldStop` is absent: the same position, ruleset and depth
 * always give the same move, because ties break by generation order and nothing here
 * consults a clock or a random number.
 *
 * @param state Position to search from. Never mutated.
 * @param options Depth, feature switches and the abort signal.
 * @returns The best result from the deepest iteration that finished. An iteration
 *   interrupted part-way is **discarded**, never returned: its move list is only half
 *   searched, so its "best" move is an artefact of where it stopped.
 */
export function search(state: GameState, options: SearchOptions): SearchResult {
  const context: SearchContext = {
    nodes: 0,
    quiescenceNodes: 0,
    aborted: false,
    quiescence: options.quiescence ?? true,
    ordering: options.ordering ?? true,
    shouldStop: options.shouldStop,
  }

  const rootMoves = allLegalMoves(state, state.turn)
  if (rootMoves.length === 0) {
    return {
      move: null,
      score: terminalScore(state, asPly(0)),
      pv: [],
      nodes: 0,
      quiescenceNodes: 0,
      depth: asDepth(0),
    }
  }

  let completed: SearchResult = {
    move: rootMoves[0]!,
    score: DRAW_SCORE,
    pv: [rootMoves[0]!],
    nodes: 0,
    quiescenceNodes: 0,
    depth: asDepth(0),
  }

  for (let iteration = 1; iteration <= options.maxDepth; iteration++) {
    const attempt = searchToDepth(state, asDepth(iteration), rootMoves, completed.move, context)
    if (context.aborted) break

    completed = attempt
    options.onIteration?.(attempt)
  }

  return completed
}

/** One complete iteration of iterative deepening. */
function searchToDepth(
  state: GameState,
  iterationDepth: Depth,
  rootMoves: readonly Move[],
  previousBest: Move | null,
  context: SearchContext,
): SearchResult {
  const moves = context.ordering ? orderMoves(state, rootMoves, previousBest) : [...rootMoves]

  let best: Move = moves[0]!
  let bestScore = cp(-INFINITE_SCORE)
  let bestLine: readonly Move[] = []

  for (const move of moves) {
    const line: Move[] = []
    const score = cp(-alphaBeta(
      advancePosition(state, move),
      asDepth(iterationDepth - 1),
      asPly(1),
      cp(-INFINITE_SCORE),
      cp(-bestScore),
      context,
      line,
    ))
    if (context.aborted) break

    // Strict `>`: the first move of equal value wins, which keeps ties deterministic and
    // lets the unpruned searcher reproduce this exact choice.
    if (score > bestScore) {
      bestScore = score
      best = move
      bestLine = line
    }
  }

  return {
    move: best,
    score: normalised(bestScore),
    pv: [best, ...bestLine],
    nodes: context.nodes,
    quiescenceNodes: context.quiescenceNodes,
    depth: iterationDepth,
  }
}

/**
 * Negamax with alpha-beta pruning, fail-soft.
 *
 * *Fail-soft* means it returns the best score it actually found even when that falls
 * outside `[alpha, beta]`, rather than clamping to the window bound. The extra information
 * costs nothing and is what a transposition table will later need to store a useful bound.
 *
 * @param state Node to search. Never mutated.
 * @param remaining Plies still to search below here.
 * @param atPly Distance from the root — used only for mate scoring, and *not*
 *   interchangeable with `remaining`. See `types.ts`.
 * @param alpha The best score the searching side has already secured elsewhere.
 * @param beta The best the opponent will permit. A score at or above it means this node is
 *   unreachable in real play, so the remaining moves need not be examined.
 * @param context Counters, feature switches and the abort flag.
 * @param pv Filled with the best line found below this node.
 */
export function alphaBeta(
  state: GameState,
  remaining: Depth,
  atPly: Ply,
  alpha: Centipawns,
  beta: Centipawns,
  context: SearchContext,
  pv: Move[],
): Centipawns {
  context.nodes++
  if (shouldAbort(context)) return DRAW_SCORE

  // The depth check comes **before** move generation, and that ordering is worth about a
  // third of the search's total cost. Generating every legal move at a leaf only to hand
  // control to quiescence — which generates its own — meant paying ~300 µs per leaf for a
  // list that was immediately discarded.
  if (remaining <= 0) {
    return context.quiescence
      ? quiescence(state, alpha, beta, atPly, context)
      : evaluate(state, state.turn)
  }

  // A dead position is drawn however many pieces are still moving; searching on would let
  // the engine chase a win that cannot exist.
  if (isInsufficientMaterial(state)) return DRAW_SCORE

  const moves = allLegalMoves(state, state.turn)
  if (moves.length === 0) return terminalScore(state, atPly)

  const ordered = context.ordering ? orderMoves(state, moves, null) : moves
  let bestScore = cp(-INFINITE_SCORE)
  let current = alpha

  for (const move of ordered) {
    const line: Move[] = []
    const score = cp(-alphaBeta(
      advancePosition(state, move),
      asDepth(remaining - 1),
      asPly(atPly + 1),
      cp(-beta),
      cp(-current),
      context,
      line,
    ))
    if (context.aborted) break

    if (score > bestScore) {
      bestScore = score
      pv.length = 0
      pv.push(move, ...line)
    }
    if (score > current) current = score
    // The cutoff. The opponent had a better option earlier in the tree, so this node will
    // never be reached and the remaining moves are irrelevant.
    if (current >= beta) break
  }

  return bestScore
}

/**
 * QUIESCENCE — searching past the depth limit until nothing is hanging.
 *
 * **What is this?** When the main search runs out of depth it has to evaluate *something*,
 * and it may well stop half-way through a capture sequence — right after `QxP`, before
 * `PxQ`. Evaluating there reports a won pawn when the truth is a lost queen. That is the
 * **horizon effect**, and it makes a fixed-depth engine tactically blind in exactly the
 * positions where tactics decide the game.
 *
 * **How does it work?** At the leaves, keep searching — but only *forcing* moves, captures
 * and promotions. Those sequences terminate quickly because material runs out, so the
 * extra depth is cheap. When no forcing move improves on simply standing still, the
 * position is quiet and can be trusted.
 *
 * **The stand-pat.** Before searching anything, take the static evaluation as a floor: the
 * side to move is not *obliged* to capture, so it can always decline and accept the
 * current score. That is `standPat`, and it is what stops quiescence from forcing a side
 * to play a losing capture just because it is the only capture.
 *
 * **What is subtle? — you may not stand pat while in check.** Declining to move is not an
 * option when the king is attacked, so a checked node must generate *every* legal move,
 * not just the forcing ones, and must not use the static score as a floor. Getting this
 * wrong makes the engine believe it can ignore a check, which is the single most
 * destructive bug in this function (`prj-mgmt/epics/engine/research/search.md`).
 *
 * **What does the mirror seam change about this?** This is one of the two places the seam
 * is expected to bite hardest. Captures can arrive from the far side of the board, so the
 * forcing-move list is longer at every node and the sequences branch more. Quiescence
 * explosion is a live risk rather than a theoretical one, which is why the node count is
 * tracked separately and why `MAX_PLY` is a hard floor rather than a formality.
 */
export function quiescence(
  state: GameState,
  alpha: Centipawns,
  beta: Centipawns,
  atPly: Ply,
  context: SearchContext,
): Centipawns {
  context.nodes++
  context.quiescenceNodes++
  if (shouldAbort(context)) return DRAW_SCORE
  if (atPly >= MAX_PLY) return evaluate(state, state.turn)

  const inCheck = isInCheck(state, state.turn)

  let best: Centipawns
  let current = alpha
  let candidates: Move[]

  if (inCheck) {
    // No standing pat: the king is attacked, so "do nothing" is not on the menu, and every
    // evasion must be considered — forcing or not. This is the one path that needs the
    // full legal move list, and the one where paying for it is not optional.
    candidates = allLegalMoves(state, state.turn)
    if (candidates.length === 0) return terminalScore(state, atPly)
    best = cp(-INFINITE_SCORE)
  } else {
    best = evaluate(state, state.turn)
    if (best >= beta) return best
    if (best > current) current = best
    candidates = forcingMoves(state)
  }

  const ordered = context.ordering ? orderMoves(state, candidates, null) : candidates

  for (const move of ordered) {
    const score = cp(-quiescence(
      advancePosition(state, move),
      cp(-beta),
      cp(-current),
      asPly(atPly + 1),
      context,
    ))
    if (context.aborted) break

    if (score > best) best = score
    if (score > current) current = score
    if (current >= beta) break
  }

  return best
}

/**
 * Plain negamax — **no pruning**, every move examined at every node.
 *
 * Exists to prove {@link alphaBeta} correct, not to be used. Alpha-beta must return the
 * identical score and choose the identical move at the same depth; if it ever does not,
 * the pruning is unsound and the engine is silently playing a different game from the one
 * it is meant to. The cheapest possible insurance against the most expensive possible bug
 * class, and the reason the duplication is deliberate rather than sloppy (ADR 0002).
 *
 * Exponentially slower — use it at depth 3 or less.
 */
export function negamax(
  state: GameState,
  remaining: Depth,
  atPly: Ply,
  context: SearchContext,
  pv: Move[],
): Centipawns {
  context.nodes++

  const moves = allLegalMoves(state, state.turn)
  if (moves.length === 0) return terminalScore(state, atPly)
  if (isInsufficientMaterial(state)) return DRAW_SCORE
  if (remaining <= 0) {
    return context.quiescence
      ? quiescence(state, cp(-INFINITE_SCORE), cp(INFINITE_SCORE), atPly, context)
      : evaluate(state, state.turn)
  }

  const ordered = context.ordering ? orderMoves(state, moves, null) : moves
  let bestScore = cp(-INFINITE_SCORE)

  for (const move of ordered) {
    const line: Move[] = []
    const score = cp(-negamax(advancePosition(state, move), asDepth(remaining - 1), asPly(atPly + 1), context, line))
    if (score > bestScore) {
      bestScore = score
      pv.length = 0
      pv.push(move, ...line)
    }
  }
  return bestScore
}

/**
 * Search with no pruning at all, for comparison against {@link search}.
 *
 * Takes the same options so the comparison is like for like: ordering and quiescence must
 * be configured identically in both, or the difference being measured is not the one under
 * test. No iterative deepening — it exists to be simple, not fast.
 */
export function searchUnpruned(state: GameState, options: SearchOptions): SearchResult {
  const context: SearchContext = {
    nodes: 0,
    quiescenceNodes: 0,
    aborted: false,
    quiescence: options.quiescence ?? true,
    ordering: options.ordering ?? true,
    shouldStop: undefined,
  }
  const pv: Move[] = []
  const score = negamax(state, options.maxDepth, asPly(0), context, pv)

  return {
    move: pv[0] ?? null,
    score: normalised(score),
    pv,
    nodes: context.nodes,
    quiescenceNodes: context.quiescenceNodes,
    depth: options.maxDepth,
  }
}

/**
 * The legal captures and promotions available, without generating anything else.
 *
 * The optimisation that makes quiescence affordable. `allLegalMoves` legality-filters
 * *every* pseudo-legal move — a board copy plus a full attack scan each — and quiescence
 * then throws ~90% of them away. Filtering to forcing moves **first** and legality-checking
 * only the survivors does the expensive part four times instead of forty, at nodes that are
 * 80–95% of the whole search.
 *
 * **The honest cost.** Because the full legal list is never built, a quiescence node that
 * is *stalemate* cannot be recognised, and is scored by standing pat instead of as a draw.
 * Every engine makes this trade; it is recorded here rather than left to be discovered.
 * Stalemate at the **root** is unaffected — `search` checks that directly — so the only
 * error is a slightly wrong evaluation deep inside a line, in a position that is rare and
 * usually already lopsided.
 */
function forcingMoves(state: GameState): Move[] {
  const out: Move[] = []
  for (let index = 0; index < 64; index++) {
    const piece = state.board[index]
    if (!piece || piece.color !== state.turn) continue
    const from = { f: index % 8, r: Math.floor(index / 8) }
    for (const move of pseudoLegalMovesFor(state, from)) {
      if (!isForcing(move)) continue
      // Legality last: this is the expensive test, so it runs on the few, not the many.
      if (isInCheck({ board: applyMoveToBoard(state.board, move), rules: state.rules }, piece.color)) continue
      out.push(move)
    }
  }
  return out
}

/**
 * The score of a position with no legal move.
 *
 * Mate is `MATE_SCORE - atPly` rather than a flat `MATE_SCORE`, so a mate found *sooner*
 * scores higher and the engine takes the fastest kill instead of dawdling. Get this wrong
 * and the engine finds forced mates and then declines to play them — which looks like a
 * search bug and is actually an arithmetic one.
 */
function terminalScore(state: GameState, atPly: Ply): Centipawns {
  return isInCheck(state, state.turn) ? cp(-(MATE_SCORE - atPly)) : DRAW_SCORE
}

/**
 * Collapse `-0` to `0` at the public boundary.
 *
 * Negamax negates on the way up, and negating a drawn score produces JavaScript's negative
 * zero. Nothing inside the search notices — it compares equal under `===` — but it is a
 * distinct value to `Object.is`, it serialises as `-0`, and it would eventually reach a
 * reader as an evaluation of "-0.00". Normalising once here costs nothing; doing it inside
 * `cp` would add a comparison to every negation in the hot loop.
 */
function normalised(score: Centipawns): Centipawns {
  return score === 0 ? DRAW_SCORE : score
}
