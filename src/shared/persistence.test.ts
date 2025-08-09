import { describe, it, expect, beforeEach, vi } from 'vitest'
import { deleteSavedGame, listSavedGames, loadSavedGame, saveGame } from './persistence'
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
})


