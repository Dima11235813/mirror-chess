import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deleteSavedGame, listSavedGames, loadSavedGame, saveGame, renameSavedGame, isValidGameName, GAME_NAME_MAX_LEN, GAME_NAME_MIN_LEN } from './persistence'
import type { GameState } from '../game/types'
import { DEFAULT_RULES, RULES_SLIDERS_ONLY, TOKEN_SLIDERS_ONLY } from '../game/rules'
import { positionKey } from '../game/position-key'
import { fromPiecesSpec } from '../game/setup'
import { reduceMove } from '../game/reducer'
import { repetitionCount } from '../game/draw-rules'
import { parseAlgebraic } from '../game/coord'
import { NO_CASTLING_RIGHTS, makeMove } from '../game/move'

const sampleState = (turn: GameState['turn']): GameState => {
  const board = Array(64).fill(null)
  const context = { castling: NO_CASTLING_RIGHTS, enPassant: null }
  return {
    board,
    turn,
    rules: DEFAULT_RULES,
    inCheck: false,
    halfmoveClock: 0,
    history: [positionKey(board, turn, context)],
    plies: 0,
    ...context,
  }
}

describe('persistence', () => {
  beforeEach(() => {
    // jsdom provides localStorage; reset between tests
    window.localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
    // random stable
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
  })

  it('saves and lists games newest first', () => {
    const a = saveGame(sampleState('white'))
    vi.setSystemTime(new Date('2024-01-01T00:01:00Z'))
    const b = saveGame(sampleState('black'))

    const list = listSavedGames()
    expect(list.length).toBe(2)
    const bMeta = list[0]!
    const aMeta = list[1]!
    expect(bMeta.id).toBe(b.id)
    expect(aMeta.id).toBe(a.id)
    expect(bMeta.turn).toBe('black')
  })

  it('loads and deletes by id', () => {
    const a = saveGame(sampleState('white'))
    const loaded = loadSavedGame(a.id)
    expect(loaded?.turn).toBe('white')
    deleteSavedGame(a.id)
    expect(loadSavedGame(a.id)).toBeNull()
  })

  it('persists optional name and lists it', () => {
    const a = saveGame(sampleState('white'), 'My First Game')
    const list = listSavedGames()
    expect(list[0]?.id).toBe(a.id)
    expect(list[0]?.name).toBe('My First Game')
  })

  it('renames a saved game when valid', () => {
    const a = saveGame(sampleState('black'))
    renameSavedGame(a.id, 'Renamed Game')
    const list = listSavedGames()
    const meta = list.find(m => m.id === a.id)
    expect(meta?.name).toBe('Renamed Game')
  })

  it('does not rename when invalid length', () => {
    const a = saveGame(sampleState('white'))
    renameSavedGame(a.id, 'no') // too short
    const list = listSavedGames()
    const meta = list.find(m => m.id === a.id)
    expect(meta?.name).toBeUndefined()
  })

  it('name validation respects unicode and boundaries', () => {
    expect(isValidGameName('ab')).toBe(false)
    expect(isValidGameName('abc')).toBe(true)
    const twoHundred = 'x'.repeat(GAME_NAME_MAX_LEN)
    expect(twoHundred.length).toBe(GAME_NAME_MAX_LEN)
    expect(isValidGameName(twoHundred)).toBe(true)
    const twoHundredOne = twoHundred + 'y'
    expect(isValidGameName(twoHundredOne)).toBe(false)
    const emoji = '👍'
    expect(isValidGameName(emoji.repeat(GAME_NAME_MIN_LEN))).toBe(true)
    expect(isValidGameName(emoji.repeat(GAME_NAME_MAX_LEN + 1))).toBe(false)
  })
})



describe('persistence: the ruleset travels with the game', () => {
  it('round-trips a non-default ruleset', () => {
    const saved = saveGame({ ...sampleState('white'), rules: RULES_SLIDERS_ONLY })
    const loaded = loadSavedGame(saved.id)

    expect(loaded?.rules).toEqual(RULES_SLIDERS_ONLY)
    expect(loaded?.rules).not.toEqual(DEFAULT_RULES)
  })

  it('stores the token, not the expanded flags', () => {
    saveGame({ ...sampleState('white'), rules: RULES_SLIDERS_ONLY })
    const raw = window.localStorage.getItem('mirror-chess:saves') ?? ''

    // The short stable identity is what survives the flag set growing.
    expect(raw).toContain(TOKEN_SLIDERS_ONLY)
    expect(raw).not.toContain('portal')
  })

  it('reads a save written before rule flags existed as the default ruleset', () => {
    // Exactly the shape older builds wrote: a state with no rules and no token.
    window.localStorage.setItem('mirror-chess:saves', JSON.stringify([
      { id: 'legacy', savedAt: 1, state: { board: Array(64).fill(null), turn: 'white', inCheck: false } },
    ]))

    expect(loadSavedGame('legacy')?.rules).toEqual(DEFAULT_RULES)
  })

  it('falls back to the default rather than throwing on a corrupt token', () => {
    window.localStorage.setItem('mirror-chess:saves', JSON.stringify([
      { id: 'corrupt', savedAt: 1, state: { board: Array(64).fill(null), turn: 'white', inCheck: false, rulesToken: 'QRB---' } },
    ]))

    // A damaged field should not cost a player their game.
    expect(loadSavedGame('corrupt')?.rules).toEqual(DEFAULT_RULES)
  })
})

describe('persistence: the draw history travels with the game', () => {
  it('round-trips the clock, the repetition history and the ply count', () => {
    // A game mid-shuffle: the same position has already occurred twice.
    let state = fromPiecesSpec('w:Ke1,Nb1; b:Ke8,Nb8', 'white')
    for (const [from, to] of [['b1', 'c3'], ['b8', 'c6'], ['c3', 'b1'], ['c6', 'b8']] as const) {
      state = reduceMove(state, makeMove(parseAlgebraic(from), parseAlgebraic(to), 'quiet'))
    }
    expect(repetitionCount(state)).toBe(2)

    const loaded = loadSavedGame(saveGame(state).id)

    expect(loaded?.halfmoveClock).toBe(state.halfmoveClock)
    expect(loaded?.plies).toBe(state.plies)
    expect(loaded?.history).toEqual(state.history)
    // The point of saving it at all: the resumed game is still one repetition from a draw.
    expect(repetitionCount(loaded!)).toBe(2)
  })

  it('resumes a save written before the draw rules with a clean slate', () => {
    // Older builds wrote no clock and no history. Inventing one would be inventing a
    // game; starting fresh only risks playing on, which is the safe direction.
    window.localStorage.setItem('mirror-chess:saves', JSON.stringify([
      { id: 'legacy', savedAt: 1, state: { board: Array(64).fill(null), turn: 'white', inCheck: false } },
    ]))

    const loaded = loadSavedGame('legacy')

    expect(loaded?.halfmoveClock).toBe(0)
    expect(loaded?.plies).toBe(0)
    expect(loaded?.history).toHaveLength(1)
    expect(repetitionCount(loaded!)).toBe(1)
  })
})
