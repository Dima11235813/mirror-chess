import { useMemo, useState } from 'react'
import { IonButton } from '@ionic/react'
import { BoardView } from '@components/BoardView'
import { gameStatus } from '@game/status'
import { reduceMove } from '@game/reducer'
import { checkPath } from '@game/attacks'
import { algebraic, parseAlgebraic } from '@game/coord'
import { isSolution, positionOf } from '@/puzzles/set'
import {
  PUZZLE_NEXT_TESTID,
  PUZZLE_PROMPT_TESTID,
  PUZZLE_REVEAL_TESTID,
  PUZZLE_SCREEN_TESTID,
  PUZZLE_VERDICT_TESTID,
} from '@shared/ui/selectors'
import type { GameState, Move } from '@game/types'
import type { PuzzleScreenProps, SolveState } from './PuzzleScreen.types'

/**
 * THE PUZZLE SCREEN — one position, one right answer, and why it only exists here.
 *
 * **What is this?** The playable face of the mined set: it shows a position, accepts one
 * move, and says whether that move was the mate.
 *
 * **Why is it here?** A puzzle set is unjudgeable as JSON. The point of the product is
 * whether solving one is *interesting*, and that question needs a board.
 *
 * **How does it work?** The player plays the key move only. That is not a simplification
 * of the puzzle but exactly what the miner proved: a *unique* first move forces mate
 * (`prj-mgmt/epics/puzzles/mine-mate-in-2.md`). So the screen needs no engine at runtime —
 * it compares the move against the record and the record was proved against the rules.
 *
 * A wrong move is not played out. It is refused with a reason, and the board stays as it
 * was, because in a mate-in-two there is nothing instructive to show down a line that does
 * not force mate.
 *
 * **What does the mirror seam change about this?** Everything, and only *after* the answer.
 * Highlighting the seam route up front would give the puzzle away in the 48 of 161 whose
 * solution crosses the seam — the search space is small enough that "which piece can reach
 * across" is most of the work. So the route is revealed on success, along with the claim
 * that makes the set worth playing at all: **with the seam closed, this position has no
 * forced mate.**
 */
export function PuzzleScreen({ puzzles, startIndex = 0 }: PuzzleScreenProps) {
  const [index, setIndex] = useState(() => clamp(startIndex, puzzles.length))
  const [solveState, setSolveState] = useState<SolveState>('thinking')
  /**
   * The position after the answer, once it is found.
   *
   * The player only has to *identify* the move, but they should still watch it happen —
   * a reveal that describes a journey the board never makes leaves the piece sitting
   * where it started, which is what the first version did.
   */
  const [solvedPosition, setSolvedPosition] = useState<GameState | null>(null)

  const puzzle = puzzles[index]!
  // Rebuilt only when the puzzle changes: parsing a FEN is cheap, but a fresh object per
  // render would reset the board's own selection state on every keystroke elsewhere.
  const state = useMemo(() => positionOf(puzzle), [puzzle])
  const shown = solvedPosition ?? state
  const status = useMemo(() => gameStatus(shown), [shown])

  /** The squares the winning piece travelled, including its trip through the seam. */
  const route = useMemo(() => {
    if (solveState !== 'solved') return []
    return checkPath(state, parseAlgebraic(puzzle.solution.from), parseAlgebraic(puzzle.solution.to))
      .map(algebraic)
  }, [solveState, state, puzzle])

  const onMove = (move: Move) => {
    if (solveState === 'solved') return
    const played = {
      from: algebraic(move.from),
      to: algebraic(move.to),
      promotion: move.promotion as string | null,
    }
    if (!isSolution(puzzle, played)) {
      // A wrong move is not played out: in a mate in two there is nothing instructive
      // down a line that does not force mate, so the board stays as the puzzle set it.
      setSolveState('wrong')
      return
    }
    setSolveState('solved')
    setSolvedPosition(reduceMove(state, move))
  }

  const onNext = () => {
    setSolveState('thinking')
    setSolvedPosition(null)
    setIndex(i => (i + 1) % puzzles.length)
  }

  return (
    <section className="puzzle" data-testid={PUZZLE_SCREEN_TESTID}>
      <header className="puzzle-prompt">
        <p data-testid={PUZZLE_PROMPT_TESTID}>
          <strong>White to play. Mate in 2.</strong>{' '}
          <span className="puzzle-meta">
            Puzzle {index + 1} of {puzzles.length} · {puzzle.material} · rules {puzzle.ruleset}
          </span>
        </p>
      </header>

      {/*
        The board is locked once solved so the position stays as the reveal describes it.
        `BoardView` is reused unchanged: it already draws portal destinations, check paths
        and accessible names, and it asks the game core what is legal rather than deciding.
      */}
      <BoardView state={shown} status={status} onMove={onMove} locked={solveState === 'solved'} />

      <p role="status" aria-live="polite" data-testid={PUZZLE_VERDICT_TESTID}>
        {solveState === 'solved' && <strong>Solved — that is the only move that forces mate.</strong>}
        {solveState === 'wrong' && <span>Not the move: that does not force mate. Try again.</span>}
        {solveState === 'thinking' && <span>Find the move that forces mate next turn.</span>}
      </p>

      {solveState === 'solved' && (
        <div className="puzzle-reveal" data-testid={PUZZLE_REVEAL_TESTID}>
          <p>
            <strong>{puzzle.solution.coordinate}</strong>
            {puzzle.solution.crossedSeam
              ? ' crosses the seam.'
              : ' wins without crossing the seam — the mate still depends on it.'}
          </p>
          {route.length > 1 && (
            <p className="puzzle-route">
              Route: {puzzle.solution.from} → {route.join(' → ')}
            </p>
          )}
          {/*
            The claim the whole set is built on, and it is checked rather than asserted:
            every mined puzzle carries `mateInChess: false`, re-proved against the rules in
            `puzzle-set.test.ts` by running the same position with every flag off.
          */}
          <p className="puzzle-novelty">
            Impossible in chess: with every piece's portal closed, this position has no
            forced mate at all.
          </p>
        </div>
      )}

      <div className="puzzle-actions">
        <IonButton data-testid={PUZZLE_NEXT_TESTID} onClick={onNext}>
          {solveState === 'solved' ? 'Next puzzle' : 'Skip'}
        </IonButton>
      </div>
    </section>
  )
}

/** Keep a requested index inside the set, so a stale link opens a puzzle rather than crashing. */
function clamp(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0) return 0
  return index % Math.max(1, length)
}
