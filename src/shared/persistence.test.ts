import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deleteSavedGame, listSavedGames, loadSavedGame, saveGame, renameSavedGame, isValidGameName, GAME_NAME_MAX_LEN, GAME_NAME_MIN_LEN } from './persistence'
import type { GameState } from '../game/types'

const sampleState = (turn: GameState['turn']): GameState => ({
  board: Array(64).fill(null),
  turn,
  inCheck: false,
})

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


