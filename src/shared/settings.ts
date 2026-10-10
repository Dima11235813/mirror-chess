/**
 * USER SETTINGS — small, persisted, and parsed rather than trusted.
 *
 * **What is this?** The handful of preferences that change how the app behaves, stored in
 * `localStorage` so they survive a reload.
 * Stories: `prj-mgmt/epics/user-moves/submit-move/submit-mode.md` and
 * `prj-mgmt/epics/board-interactions/customization/persist-settings.md`.
 *
 * **Why is it here and not in a component?** Because two screens need the same answer —
 * the game board and the puzzle screen both ask "may I commit this move immediately?" —
 * and because reading `localStorage` is a trust boundary, which deserves one guarded door
 * rather than a `JSON.parse` at each call site.
 *
 * **What is subtle?** `localStorage` is **untrusted input**. It survives upgrades, it can
 * be edited by hand in devtools, and a value written by a future version of this app will
 * one day be read by an older one. So this module *parses* — field by field, with a
 * default for anything missing or of the wrong type — and never casts
 * (`docs/design-patterns/parse-dont-validate.md`, CLAUDE.md §8). A malformed blob costs
 * the user their preferences, never a crash on load.
 *
 * Every accessor is also wrapped against a throwing `localStorage`: Safari in private
 * mode and some embedded browsers throw on access rather than returning null.
 */

/** What the user can change. Keep it small; every entry is a thing to explain and test. */
export interface Settings {
  /**
   * Commit a move as soon as a destination is chosen.
   *
   * `true` is the default and the behaviour the app has always had. `false` holds the move
   * and waits for an explicit Submit, which is what makes the board safe to use with a
   * thumb on a phone.
   */
  readonly autoSubmit: boolean
}

export const DEFAULT_SETTINGS: Settings = { autoSubmit: true }

/** Where settings live. Versioned, so a future shape change can migrate rather than guess. */
const STORAGE_KEY = 'mirror-chess:settings:v1'

/**
 * Read a boolean field, falling back to the default when it is absent or not a boolean.
 *
 * Deliberately strict about the type: a stored `"false"` (a *string*, as a hand-edit or a
 * sloppy writer would leave) is not `false`, and silently coercing it would turn a typo
 * into a behaviour change the user never asked for.
 */
function boolField(source: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = source[key]
  return typeof value === 'boolean' ? value : fallback
}

/**
 * Parse anything into a usable `Settings`.
 *
 * @param value Untrusted — from `localStorage`, a test, or one day a synced profile.
 * @returns A complete `Settings`. Never throws and never returns a partial object: an
 *   unrecognisable input yields the defaults, and a partially recognisable one keeps the
 *   fields it got right.
 */
export function parseSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return DEFAULT_SETTINGS
  const source = value as Record<string, unknown>
  return { autoSubmit: boolField(source, 'autoSubmit', DEFAULT_SETTINGS.autoSubmit) }
}

/**
 * Load the stored settings.
 *
 * @returns The user's settings, or the defaults when nothing is stored, the stored value
 *   is unreadable, or `localStorage` itself throws.
 */
export function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return parseSettings(JSON.parse(raw))
  } catch {
    // A corrupt blob or a storage-denied browser both mean the same thing to a user:
    // they get the defaults, and the app opens.
    return DEFAULT_SETTINGS
  }
}

/**
 * Persist settings immediately.
 *
 * @param settings What to store. Written whole, so a removed field cannot linger.
 * @returns `true` when it was stored. `false` means storage refused — worth telling the
 *   user, because their choice will not survive the reload they expect it to.
 */
export function saveSettings(settings: Settings): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
