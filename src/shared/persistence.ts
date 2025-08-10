import type { GameState } from '@game/types'

/**
 * A saved game entry persisted to localStorage.
 * `state` is stored as-is; keep in UI layer (side-effects allowed here).
 */
export interface SavedGame {
  readonly id: string
  readonly savedAt: number
  readonly state: GameState
  /** Optional human label. Backward compatible for older saves. */
  readonly name?: string
}

/** Lightweight metadata for rendering lists without loading full state. */
export interface SavedGameMeta {
  readonly id: string
  readonly savedAt: number
  readonly turn: GameState['turn']
  readonly name?: string
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

export const GAME_NAME_MIN_LEN = 3
export const GAME_NAME_MAX_LEN = 200

/** Allow any characters; only constrain length by unicode code points. */
export function isValidGameName(name: string): boolean {
  const length = [...name].length
  return length >= GAME_NAME_MIN_LEN && length <= GAME_NAME_MAX_LEN
}

/**
 * Persist a game state as a new save entry. Returns the saved entry.
 * Ordering: newest first when listed.
 */
export function saveGame(state: GameState, name?: string): SavedGame {
  const entry: SavedGame = {
    id: generateId(),
    savedAt: Date.now(),
    state,
    ...(name !== undefined ? { name } : {}),
  }
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
    .map(({ id, savedAt, state, name }) => ({
      id,
      savedAt,
      turn: state.turn,
      ...(name !== undefined ? { name } : {}),
    }))
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

/** Rename a saved game by id. No-op if not found or invalid name. */
export function renameSavedGame(id: string, name: string): void {
  if (!isValidGameName(name)) return
  const all = readAll()
  const idx = all.findIndex(s => s.id === id)
  if (idx === -1) return
  const existing = all[idx]!
  if (existing.name === name) return
  const updated: SavedGame = { ...existing, name }
  const next = all.slice()
  next[idx] = updated
  writeAll(next)
}

/**
 * Get all saved games data for backup/export purposes.
 * Returns the full saved games array with complete game states.
 */
export function getAllSavedGames(): readonly SavedGame[] {
  return readAll()
}

/**
 * Generate a filename for the games export with current date.
 * Format: mirror-chess-games-YYYY-MM-DD.json
 */
export function generateGamesExportFilename(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `mirror-chess-games-${year}-${month}-${day}.json`
}


