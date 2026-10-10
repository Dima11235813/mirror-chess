import { useMemo, useState } from 'react'
import { IonButton } from '@ionic/react'
import { BoardView } from '@components/BoardView'
import { ReservedText } from '@components/ReservedText/ReservedText'
import { gameStatus } from '@game/status'
import { reduceMove } from '@game/reducer'
import { checkPath } from '@game/attacks'
import { algebraic, parseAlgebraic } from '@game/coord'
import { isSolution, positionOf } from '@/puzzles/puzzle'
import {
  PUZZLE_NEXT_TESTID,
  PUZZLE_PROMPT_TESTID,
  PUZZLE_REVEAL_TESTID,
  PUZZLE_SCREEN_TESTID,
  PUZZLE_VERDICT_TESTID,
  PUZZLE_BAND_TESTID,
} from '@shared/ui/selectors'
import type { GameState, Move } from '@game/types'
import type { ChessDifferential, PuzzleGoal } from '@/puzzles/types'
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
export function PuzzleScreen({ puzzles, startIndex = 0, autoSubmit = true }: PuzzleScreenProps) {
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
        {/* A heading, not a paragraph: it is this section's title, and the document had no
            headings at all before — `ion-title` renders in a shadow root with no role, so
            a screen reader had nothing to navigate by.

            Two lines, and the number is measured rather than chosen: across all 248
            puzzles the longest prompt is 83 characters and the shortest 77, and both wrap
            to exactly two lines at every width from 320px up. So this screen was **not**
            shifting — the suspicion in `layout-shift.md` §5 was wrong — and the reserve is
            here to keep it that way when the set is next re-mined with longer material
            strings. A third line would be 21.6px of dead space above the board on every
            puzzle, which is what reserving by guesswork costs. */}
        <ReservedText
          lines={2}
          as="h2"
          label="the puzzle's details"
          wrapperClassName="puzzlePromptSlot"
          testId={PUZZLE_PROMPT_TESTID}
        >
          White to play. {GOAL_TEXT[puzzle.goal]}.{' '}
          <span className="puzzle-meta">
            Puzzle {index + 1} of {puzzles.length} · {puzzle.material} ·{' '}
            <span data-testid={PUZZLE_BAND_TESTID}>{puzzle.difficulty}</span> · rules {puzzle.ruleset}
          </span>
        </ReservedText>
      </header>

      {/*
        The board is locked once solved so the position stays as the reveal describes it.
        `BoardView` is reused unchanged: it already draws portal destinations, check paths
        and accessible names, and it asks the game core what is legal rather than deciding.
      */}
      <BoardView
        state={shown}
        status={status}
        onMove={onMove}
        locked={solveState === 'solved'}
        autoSubmit={autoSubmit}
      />

      <p role="status" aria-live="polite" data-testid={PUZZLE_VERDICT_TESTID}>
        {solveState === 'solved' && (
          <strong>Solved — that is the only move that forces {GOAL_TEXT[puzzle.goal].toLowerCase()}.</strong>
        )}
        {solveState === 'wrong' && <span>Not the move: that does not force mate. Try again.</span>}
        {solveState === 'thinking' && <span>Find the move that forces mate next turn.</span>}
      </p>

      {/*
        The reveal is announced, because this is the part worth hearing. The verdict
        ("Solved") was a live region from the start; the explanation of why the puzzle is
        impossible in chess was not, so a screen-reader user learned that they had solved it
        and never learned what they had solved. `polite` rather than a focus move: moving
        focus would fight a keyboard player who is still on the board.
      */}
      {solveState === 'solved' && (
        <div
          className="puzzle-reveal"
          data-testid={PUZZLE_REVEAL_TESTID}
          role="status"
          aria-live="polite"
        >
          <p>
            <strong>{puzzle.solution.coordinate}</strong>
            {/*
              States only what the MOVE did. Whether the seam mattered at all is the next
              line's job: written when every puzzle was seam-dependent, this clause used to
              claim "the mate still depends on it", which flatly contradicted the reveal
              below on an ordinary tactic. A screenshot caught it.
            */}
            {puzzle.solution.crossedSeam ? ' crosses the seam.' : ' stays on its own side of the seam.'}
          </p>
          {route.length > 1 && (
            <p className="puzzle-route">
              Route: {puzzle.solution.from} → {route.join(' → ')}
            </p>
          )}
          {/*
            What the seam was actually worth here, re-derived from the position rather than
            asserted (`puzzle-set.test.ts` re-solves each one with every flag off).

            Since 2026-09-26 this can say "ordinary chess tactic", and that is the point:
            a library where the seam always matters is one a player can predict, and the
            interesting question is whether it matters *here*.
          */}
          <p className="puzzle-novelty">{DIFFERENTIAL_TEXT[puzzle.chessDifferential]}</p>
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

/** What the player is asked for, per goal. */
const GOAL_TEXT: Readonly<Record<PuzzleGoal, string>> = {
  'mate-in-2': 'Mate in 2',
  'mate-in-3': 'Mate in 3',
}

/**
 * What the seam was worth, in the player's terms.
 *
 * Read after solving, never before: three of these four give away that the seam matters.
 */
const DIFFERENTIAL_TEXT: Readonly<Record<ChessDifferential, string>> = {
  'dead-in-chess':
    'Impossible in chess — with the portals closed this is not even a live game: ' +
    'chess would call this material insufficient to mate at all.',
  'no-mate-in-chess':
    'Impossible in chess: with every piece’s portal closed, this position has no forced mate at all.',
  'different-mate-in-chess':
    'Chess has a mate here too — but a different one. The seam changes the answer.',
  'same-mate-in-chess':
    'An ordinary tactic: this same move mates in chess. Not every puzzle here needs the seam, ' +
    'which is why you cannot assume the answer crosses it.',
}

/** Keep a requested index inside the set, so a stale link opens a puzzle rather than crashing. */
function clamp(index: number, length: number): number {
  if (!Number.isInteger(index) || index < 0) return 0
  return index % Math.max(1, length)
}
