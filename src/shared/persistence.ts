import type { Board, CastlingRights, Color, Coord, GameState } from '@game/types'
import { DEFAULT_RULESET_TOKEN, rulesOf, tokenOf, type RuleSetToken } from '@game/rules'
import { tryResolveRuleSet } from '@game/ruleset-registry'
import { positionKey, type PositionKey } from '@game/position-key'
import { castlingRightsFromBoard } from '@game/setup'

/**
 * A saved game entry persisted to localStorage.
 *
 * Side effects are allowed in this layer; the game core stays pure.
 */
export interface SavedGame {
  readonly id: string
  readonly savedAt: number
  readonly state: GameState
  /** Optional human label. Backward compatible for older saves. */
  readonly name?: string
}

/**
 * How a state is written to storage: the ruleset collapsed to its **token**.
 *
 * Storing the token rather than the expanded flags is what lets the flag set grow
 * without invalidating saves — a token is append-only by construction, so one written
 * today still means what it meant when a seventh flag exists
 * (`prj-mgmt/epics/engine/adr/0004-ruleset-identity-and-tokens.md`).
 */
interface StoredState {
  readonly board: Board
  readonly turn: Color
  readonly inCheck: boolean
  readonly rulesToken: RuleSetToken
  /** The 50-move clock. See {@link fromStored} for what an older save without it means. */
  readonly halfmoveClock: number
  /** Repetition keys since the last irreversible move, current position last. */
  readonly history: readonly PositionKey[]
  readonly plies: number
  readonly castling: CastlingRights
  readonly enPassant: Coord | null
}

/** Collapse a state's rules to their token for storage. */
function toStored(state: GameState): StoredState {
  return {
    board: state.board,
    turn: state.turn,
    inCheck: state.inCheck,
    rulesToken: tokenOf(state.rules),
    halfmoveClock: state.halfmoveClock,
    history: state.history,
    plies: state.plies,
    castling: state.castling,
    enPassant: state.enPassant,
  }
}

/**
 * Rebuild a state from storage, tolerating anything written by an older build.
 *
 * A save with no `rulesToken` predates rule flags and is read as the **default**
 * ruleset — resolved through the registry rather than hardcoded, so the default stays
 * one changeable fact. An unrecognisable token falls back the same way rather than
 * throwing: a corrupt field should not cost a player their game.
 *
 * A save with no draw fields predates the draw rules
 * (`prj-mgmt/epics/rules/draw-rules.md`) and resumes with a **clean slate**: clock at
 * zero and a history holding only the restored position. That is the only honest reading
 * — the game's earlier positions were never written down, so claiming any other clock
 * would be inventing history. The visible consequence is that an old save cannot be drawn
 * by a repetition that happened before it was saved, which is the right way to be wrong:
 * it plays on rather than ending a game on evidence we do not have.
 */
function fromStored(raw: StoredState & { readonly rules?: unknown }): GameState {
  const resolved = tryResolveRuleSet(raw.rulesToken) ?? tryResolveRuleSet(DEFAULT_RULESET_TOKEN)
  // A save from before castling existed gets its rights read off the board, which is what
  // `fromPiecesSpec` does and is the only reading that cannot invent a right.
  const castling = raw.castling ?? castlingRightsFromBoard(raw.board)
  const enPassant = raw.enPassant ?? null
  const history = Array.isArray(raw.history) && raw.history.length > 0
    ? raw.history
    : [positionKey(raw.board, raw.turn, { castling, enPassant })]
  return {
    board: raw.board,
    turn: raw.turn,
    inCheck: raw.inCheck ?? false,
    rules: resolved ? resolved.rules : rulesOf(DEFAULT_RULESET_TOKEN),
    castling,
    enPassant,
    halfmoveClock: raw.halfmoveClock ?? 0,
    history,
    plies: raw.plies ?? 0,
  }
}

/** Lightweight metadata for rendering lists without loading full state. */
export interface SavedGameMeta {
  readonly id: string
  readonly savedAt: number
  readonly turn: GameState['turn']
  readonly name?: string
}

const STORAGE_KEY = 'mirror-chess:saves'

/** A save entry exactly as it sits in storage. */
interface StoredGame {
  readonly id: string
  readonly savedAt: number
  readonly state: StoredState
  readonly name?: string
}

function readAll(): StoredGame[] {
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

function writeAll(all: StoredGame[]): void {
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
  const stored: StoredGame = {
    id: generateId(),
    savedAt: Date.now(),
    state: toStored(state),
    ...(name !== undefined ? { name } : {}),
  }
  const all = readAll()
  all.unshift(stored)
  writeAll(all)
  return hydrate(stored)
}

/** Expand a stored entry back into the public shape. */
function hydrate(stored: StoredGame): SavedGame {
  return {
    id: stored.id,
    savedAt: stored.savedAt,
    state: fromStored(stored.state),
    ...(stored.name !== undefined ? { name: stored.name } : {}),
  }
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
  return found ? fromStored(found.state) : null
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
  const updated: StoredGame = { ...existing, name }
  const next = all.slice()
  next[idx] = updated
  writeAll(next)
}

/**
 * Get all saved games data for backup/export purposes.
 * Returns the full saved games array with complete game states.
 */
export function getAllSavedGames(): readonly SavedGame[] {
  return readAll().map(hydrate)
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


