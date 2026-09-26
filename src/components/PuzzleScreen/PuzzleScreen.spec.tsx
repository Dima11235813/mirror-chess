import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PuzzleScreen } from './PuzzleScreen'
import { SEAM_PUZZLE, TWO_PUZZLES } from './PuzzleScreen.mocks'
import {
  PUZZLE_NEXT_TESTID,
  PUZZLE_PROMPT_TESTID,
  PUZZLE_REVEAL_TESTID,
  PUZZLE_VERDICT_TESTID,
  squareTestId,
} from '@shared/ui/selectors'

/** Play a move by clicking origin then destination, as a player does. */
const play = (from: string, to: string) => {
  fireEvent.click(screen.getByTestId(squareTestId(from)))
  fireEvent.click(screen.getByTestId(squareTestId(to)))
}

describe('PuzzleScreen', () => {
  it('states the goal and which puzzle this is', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain('White to play. Mate in 2.')
    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain('Puzzle 1 of 2')
    // The ruleset is part of a puzzle's identity: the same board under another token is a
    // different puzzle, usually with a different answer.
    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain(SEAM_PUZZLE.ruleset)
  })

  it('hides the answer until it is solved', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    expect(screen.queryByTestId(PUZZLE_REVEAL_TESTID)).toBeNull()
    expect(screen.getByTestId(PUZZLE_VERDICT_TESTID).textContent).toContain('Find the move')
  })

  it('accepts the solution and says it was the only one', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    play(SEAM_PUZZLE.solution.from, SEAM_PUZZLE.solution.to)

    expect(screen.getByTestId(PUZZLE_VERDICT_TESTID).textContent).toContain('Solved')
    expect(screen.getByTestId(PUZZLE_VERDICT_TESTID).textContent).toContain('only move that forces mate')
  })

  it('plays the move on the board, so the journey is watched and not only described', () => {
    // The first version of this screen left the piece where it started while the reveal
    // described a route it never took. Every test still passed; a screenshot caught it.
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)
    expect(screen.getByTestId(squareTestId('c4')).textContent).toContain('♞')

    play(SEAM_PUZZLE.solution.from, SEAM_PUZZLE.solution.to)

    expect(screen.getByTestId(squareTestId('c4')).textContent).toContain('♗')
    expect(screen.getByTestId(squareTestId('f8')).textContent).not.toContain('♗')
  })

  it('resets the board when moving on, rather than carrying the last answer over', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    play(SEAM_PUZZLE.solution.from, SEAM_PUZZLE.solution.to)
    fireEvent.click(screen.getByTestId(PUZZLE_NEXT_TESTID))

    // Puzzle 2 has its own position: a white bishop on f1, and nothing on c4.
    expect(screen.getByTestId(squareTestId('f1')).textContent).toContain('♗')
    expect(screen.getByTestId(squareTestId('c4')).textContent?.trim()).toBe('')
  })

  it('reveals the seam route and the claim that makes the puzzle novel', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    play(SEAM_PUZZLE.solution.from, SEAM_PUZZLE.solution.to)
    const reveal = screen.getByTestId(PUZZLE_REVEAL_TESTID)

    expect(reveal.textContent).toContain('f8-c4*')
    expect(reveal.textContent).toContain('crosses the seam')
    expect(reveal.textContent).toContain('Impossible in chess')
    // The journey, not just the destination: the bishop leaves via h6 and returns on the
    // far side. This is what a player cannot see for themselves.
    expect(reveal.textContent).toContain('h6')
    expect(reveal.textContent).toContain('a6')
  })

  it('refuses a wrong move, keeps the position, and invites another try', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    // A legal bishop move that does not force mate.
    play('c3', 'd4')

    expect(screen.getByTestId(PUZZLE_VERDICT_TESTID).textContent).toContain('Not the move')
    expect(screen.queryByTestId(PUZZLE_REVEAL_TESTID)).toBeNull()
    // The board did not move on: the piece is still where the puzzle put it.
    expect(screen.getByTestId(squareTestId('c3')).textContent).toContain('♗')
    expect(screen.getByTestId(squareTestId('d4')).textContent).not.toContain('♗')
  })

  it('lets a wrong guess be followed by the right one', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    play('c3', 'd4')
    play(SEAM_PUZZLE.solution.from, SEAM_PUZZLE.solution.to)

    expect(screen.getByTestId(PUZZLE_VERDICT_TESTID).textContent).toContain('Solved')
  })

  it('moves to the next puzzle, resetting the verdict', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} />)

    play(SEAM_PUZZLE.solution.from, SEAM_PUZZLE.solution.to)
    fireEvent.click(screen.getByTestId(PUZZLE_NEXT_TESTID))

    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain('Puzzle 2 of 2')
    expect(screen.getByTestId(PUZZLE_VERDICT_TESTID).textContent).toContain('Find the move')
    expect(screen.queryByTestId(PUZZLE_REVEAL_TESTID)).toBeNull()
  })

  it('wraps around rather than running out', () => {
    render(<PuzzleScreen puzzles={TWO_PUZZLES} startIndex={1} />)

    fireEvent.click(screen.getByTestId(PUZZLE_NEXT_TESTID))

    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain('Puzzle 1 of 2')
  })

  it('opens the puzzle a link asked for, and survives one out of range', () => {
    const { unmount } = render(<PuzzleScreen puzzles={TWO_PUZZLES} startIndex={1} />)
    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain('Puzzle 2 of 2')
    unmount()

    render(<PuzzleScreen puzzles={TWO_PUZZLES} startIndex={99} />)
    expect(screen.getByTestId(PUZZLE_PROMPT_TESTID).textContent).toContain('Puzzle 2 of 2')
  })
})
