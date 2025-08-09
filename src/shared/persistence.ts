import type { GameState } from '@/game/types'

/**
 * A saved game entry persisted to localStorage.
 * `state` is stored as-is; keep in UI layer (side-effects allowed here).
 */
export interface SavedGame {
  readonly id: string
  readonly savedAt: number
  readonly state: GameState
}

/** Lightweight metadata for rendering lists without loading full state. */
export interface SavedGameMeta {
  readonly id: string
  readonly savedAt: number
  readonly turn: GameState['turn']
}

const STORAGE_KEY = 'mirror-chess:saves'

function readAll(): SavedGame[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Best-effort validation of shape
    return parsed.filter((x: any) => x && typeof x.id === 'string' && typeof x.savedAt === 'number' && x.state && typeof x.state === 'object')
  } catch {
    return []
  }
}

function writeAll(all: SavedGame[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function generateId(): string {
  // UI layer may use Date/Math. Ensure reasonable uniqueness without deps.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Persist a game state as a new save entry. Returns the saved entry.
 * Ordering: newest first when listed.
 */
export function saveGame(state: GameState): SavedGame {
  const entry: SavedGame = { id: generateId(), savedAt: Date.now(), state }
  const all = readAll()
  all.unshift(entry)
  writeAll(all)
  return entry
}

/** Return saves sorted by most recent first. */
export function listSavedGames(): SavedGameMeta[] {
  const all = readAll()
  return all
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(({ id, savedAt, state }) => ({ id, savedAt, turn: state.turn }))
}

/** Load a previously saved game by id, or null if missing. */
export function loadSavedGame(id: string): GameState | null {
  const all = readAll()
  const found = all.find(s => s.id === id)
  return found ? found.state : null
}

/** Delete a saved game by id. No-op if not found. */
export function deleteSavedGame(id: string): void {
  const all = readAll()
  const next = all.filter(s => s.id !== id)
  writeAll(next)
}


