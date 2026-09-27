import type { Kind } from './types'

/**
 * RULE CONFIGURATION — which pieces cross the mirror seam.
 *
 * **What is this?** Mirror Chess is not one game but a family of them. Each piece's
 * portal is an independent switch, so six flags describe 64 distinct games — including
 * ordinary chess, when every flag is off.
 *
 * **Why is it here?** So the default rules can be chosen by experiment rather than
 * taste (`prj-mgmt/epics/balance/`), and so a saved game or a shared link carries the
 * rules it was played under.
 *
 * **How does it work?** Each piece has two independent rights — may it *move* across the
 * seam, and may it *capture* across it (spec §12). A permutation is identified by a
 * fixed-width **token** such as `2:bBrRqQ-----`: lowercase means the piece may move
 * across, uppercase that it may capture across, `-` neither.
 * See `prj-mgmt/epics/engine/adr/0004-ruleset-identity-and-tokens.md`.
 *
 * **What is subtle?** Token positions are **append-only**. A future seventh flag adds a
 * seventh position, and a shorter token read by a longer build means "the missing
 * positions are off" — so tokens minted today keep their meaning forever. This is why
 * {@link parseRuleSetToken} accepts a short token and {@link tokenOf} always emits the
 * full canonical width.
 */

/**
 * A validated ruleset identifier, e.g. `"BRQ---"`.
 *
 * Branded so an arbitrary string cannot be mistaken for one: values of this type have
 * been through {@link parseRuleSetToken}, which is the only way to obtain one.
 */
export type RuleSetToken = string & { readonly __brand: 'RuleSetToken' }

/**
 * What a piece may do across the seam (spec §12).
 *
 * The two rights are independent, and **attack follows capture**: a piece gives check
 * across the seam if and only if it may capture across it. There is no third,
 * independent "attack" power — one would put a king in check from a threat that could
 * never be executed.
 */
export interface PortalRights {
  /** May it move across the seam onto an **empty** square? */
  readonly quiet: boolean
  /** May it **capture** across the seam — and therefore give check through it? */
  readonly capture: boolean
}

/** Which pieces cross the seam, and how. Sliders cross by transit (§4), steppers by wrap (§11). */
export interface RuleSet {
  readonly portal: Readonly<Record<Kind, PortalRights>>
}

/**
 * The fixed, **append-only** order of flags within a token.
 *
 * Never reorder or remove an entry: doing so silently changes the meaning of every
 * token ever written to a save file or a URL. Only append.
 */
export const TOKEN_FLAG_ORDER: readonly Kind[] = ['B', 'R', 'Q', 'N', 'K', 'P']

/** The character marking a disabled flag. */
const TOKEN_OFF_CHAR = '-'

/**
 * One character position within a token: a piece and which of its rights it carries.
 *
 * **Append-only.** Never reorder or remove a slot — that silently changes the meaning of
 * every token ever written to a save file or a URL.
 *
 * The pawn has no `quiet` slot because a pawn's non-capturing move is a push, which has
 * no file component and therefore can never cross the seam (spec §12.4). A slot for it
 * would control nothing; one can be appended later if a rule ever needs it.
 */
interface TokenSlot { readonly kind: Kind; readonly right: keyof PortalRights }

const TOKEN_SLOTS: readonly TokenSlot[] = [
  { kind: 'B', right: 'quiet' }, { kind: 'B', right: 'capture' },
  { kind: 'R', right: 'quiet' }, { kind: 'R', right: 'capture' },
  { kind: 'Q', right: 'quiet' }, { kind: 'Q', right: 'capture' },
  { kind: 'N', right: 'quiet' }, { kind: 'N', right: 'capture' },
  { kind: 'K', right: 'quiet' }, { kind: 'K', right: 'capture' },
  { kind: 'P', right: 'capture' },
]



/**
 * Build a ruleset by deciding each **representable** right.
 *
 * Every constructor goes through here, so a right that has no token slot — the pawn's
 * quiet right, which could never do anything (spec §12.4) — is always false. That is
 * what makes `tokenOf(rulesOf(t)) === t` hold exactly rather than nearly.
 */
function ruleSetFromSlots(held: (slot: TokenSlot) => boolean): RuleSet {
  const portal = {} as Record<Kind, { quiet: boolean; capture: boolean }>
  for (const kind of TOKEN_FLAG_ORDER) portal[kind] = { quiet: false, capture: false }
  for (const slot of TOKEN_SLOTS) portal[slot.kind][slot.right] = held(slot)
  return { portal }
}

/** Build a ruleset by naming each piece's rights. Anything omitted is fully off. */
export function ruleSetFrom(rights: Partial<Readonly<Record<Kind, PortalRights>>>): RuleSet {
  return ruleSetFromSlots(slot => rights[slot.kind]?.[slot.right] ?? false)
}

/**
 * Build a ruleset from the pieces that cross the seam **both ways**.
 *
 * The pre-§12 shorthand, kept because it is what most callers and tests want: a piece
 * either fully crosses or does not.
 *
 * @param enabled Pieces whose portal is fully on. Any kind not listed is off.
 */
export function ruleSetOf(enabled: Iterable<Kind>): RuleSet {
  const on = new Set(enabled)
  return ruleSetFromSlots(slot => on.has(slot.kind))
}

/** Every piece crosses the seam — the current default game. */
export const RULES_ALL_ON: RuleSet = ruleSetOf(TOKEN_FLAG_ORDER)

/** Bishop, rook and queen cross; knight, king and pawn are ordinary chess (spec §4). */
export const RULES_SLIDERS_ONLY: RuleSet = ruleSetOf(['B', 'R', 'Q'])

/** No piece crosses — ordinary chess, and the control for the variant study. */
export const RULES_STANDARD_CHESS: RuleSet = ruleSetOf([])

/** The ruleset used when nothing else is specified. */
export const DEFAULT_RULES: RuleSet = RULES_ALL_ON

/**
 * May this piece move across the seam onto an **empty** square (spec §12)?
 *
 * Used by move generation only. Attack detection must use {@link portalCaptures}.
 */
export function portalQuiet(rules: RuleSet, kind: Kind): boolean {
  return rules.portal[kind].quiet
}

/**
 * May this piece **capture** across the seam (spec §12)?
 *
 * Because attack follows capture, this is also the predicate that decides whether the
 * piece gives **check** through the seam. Check detection, king safety, pins and mate
 * detection must use *this* and never {@link portalQuiet} — definition drift between the
 * two is invisible in almost every position and surfaces as an illegal mate (§12.7).
 */
export function portalCaptures(rules: RuleSet, kind: Kind): boolean {
  return rules.portal[kind].capture
}

/**
 * Does this piece cross the seam at all, in either mode?
 *
 * The geometry is the same whichever right is held — only the emit policy differs — so
 * this is what a precomputed ray table would be keyed on (ADR 0003).
 */
export function portalEnabled(rules: RuleSet, kind: Kind): boolean {
  const r = rules.portal[kind]
  return r.quiet || r.capture
}

/**
 * Is this one of the **64 standard rulesets** — the games Mirror Chess actually offers?
 *
 * **What is this?** The spec's governing principle (§2.1) made executable: *the movement
 * space expands; the rules stay the same*. A piece therefore attacks exactly the squares
 * it can move to, so a non-pawn piece holds **both** portal rights or **neither**. The
 * pawn is not an exception — chess itself separates a pawn's push from its capture, and a
 * push has no file component, so only its capture right is representable (§12.4).
 *
 * **Why is it here?** Because the alternative was measured and is a defect. With a king's
 * quiet right on and its capture right off, `Kb1–a1` is legal beside an enemy king on
 * `h1` and neither king is in check: the king crosses into a square it does not attack,
 * which is a king moving into check that no filter can see. The same objection applies to
 * every non-pawn piece — a bishop that slides across the seam without attacking across it
 * "covers" squares it cannot strike.
 *
 * **What is subtle?** This is *not* a validity check, and nothing rejects a non-standard
 * ruleset. Token positions are append-only and a token's meaning is fixed forever
 * (ADR 0004), so every token ever minted still parses and still plays. What this decides
 * is which rulesets the product offers and the study measures; the rest are experimental.
 * See `prj-mgmt/epics/rules/adjacent-kings.md`.
 *
 * @param rules Ruleset to classify.
 * @returns `true` when every non-pawn piece's two rights agree.
 */
export function isStandardRuleSet(rules: RuleSet): boolean {
  for (const kind of TOKEN_FLAG_ORDER) {
    if (kind === 'P') continue
    const { quiet, capture } = rules.portal[kind]
    if (quiet !== capture) return false
  }
  return true
}

/**
 * Every standard ruleset, as canonical tokens — the whole space, in mask order.
 *
 * Six independent crossings (`B R Q N K` whole-piece, `P` capture-only) give **64**
 * rulesets, with all six off being ordinary chess. That is small enough to enumerate,
 * which is what lets the variant study run a complete factorial rather than a fractional
 * design, and what lets a rules picker list the space instead of parsing free text.
 *
 * @returns 64 distinct tokens, ordered by the flag mask over {@link TOKEN_FLAG_ORDER}.
 */
export function standardRuleSetTokens(): readonly RuleSetToken[] {
  // Built on first call, not at module load: minting a token needs `SCHEMA_PREFIX`, which
  // is declared below this point, and an eager constant would read it in its temporal
  // dead zone. Memoised because the answer is fixed for the life of the build.
  standardTokens ??= Array.from(
    { length: 1 << TOKEN_FLAG_ORDER.length },
    (_unused, mask) => tokenOf(ruleSetOf(TOKEN_FLAG_ORDER.filter((_kind, i) => (mask & (1 << i)) !== 0))),
  )
  return standardTokens
}

let standardTokens: readonly RuleSetToken[] | null = null

/**
 * The schema this build mints tokens under.
 *
 * Bumped to 2 when spec §12 split each piece's single flag into quiet and capture. That
 * *redefined* what a position means rather than appending one, which is the case
 * ADR 0004 reserved a schema bump for. Schema-1 tokens are still read — see
 * {@link parseRuleSetToken}.
 */
export const RULESET_SCHEMA = 2

const SCHEMA_PREFIX = `${RULESET_SCHEMA}:`

/** The character a slot shows when its right is held: lowercase for quiet, uppercase for capture. */
function slotChar(slot: TokenSlot): string {
  return slot.right === 'quiet' ? slot.kind.toLowerCase() : slot.kind
}

/**
 * The canonical token for a ruleset, e.g. `2:bBrRqQ-----`.
 *
 * Lowercase means the piece may move across the seam, uppercase that it may capture
 * across it. Always full width, so this is the canonicalising direction — a short or
 * legacy token round-trips to its modern full-width equivalent.
 */
export function tokenOf(rules: RuleSet): RuleSetToken {
  let out = SCHEMA_PREFIX
  for (const slot of TOKEN_SLOTS) {
    out += rules.portal[slot.kind][slot.right] ? slotChar(slot) : TOKEN_OFF_CHAR
  }
  return out as RuleSetToken
}

/** The ruleset a token denotes. Accepts both schemas. */
export function rulesOf(token: RuleSetToken): RuleSet {
  if (!token.startsWith(SCHEMA_PREFIX)) return legacyRulesOf(token)

  const body = token.slice(SCHEMA_PREFIX.length)
  return ruleSetFromSlots(slot => body[TOKEN_SLOTS.indexOf(slot)] === slotChar(slot))
}

/**
 * Schema 1: six uppercase positions, a piece letter meaning "this piece crosses".
 *
 * Those tokens were minted before quiet and capture were separable, and a piece that
 * crossed then did so in both modes — so each set flag expands to **both** rights. That
 * is a widening, and it preserves exactly what the token meant when it was written.
 */
function legacyRulesOf(token: string): RuleSet {
  const enabled: Kind[] = []
  for (const [index, kind] of TOKEN_FLAG_ORDER.entries()) {
    if (token[index] === kind) enabled.push(kind)
  }
  return ruleSetOf(enabled)
}

/**
 * Is `raw` a syntactically valid token, under either schema?
 *
 * Position is meaningful, not membership: a character must be the off marker or exactly
 * the letter belonging to that slot. `'QRB---'` and `'2:Bb...'` are both invalid.
 */
export function isRuleSetToken(raw: string): raw is RuleSetToken {
  if (raw.startsWith(SCHEMA_PREFIX)) {
    const body = raw.slice(SCHEMA_PREFIX.length)
    if (body.length === 0 || body.length > TOKEN_SLOTS.length) return false
    return [...body].every((char, i) => char === TOKEN_OFF_CHAR || char === slotChar(TOKEN_SLOTS[i]!))
  }
  if (raw.length === 0 || raw.length > TOKEN_FLAG_ORDER.length) return false
  return [...raw].every((char, i) => char === TOKEN_OFF_CHAR || char === TOKEN_FLAG_ORDER[i])
}

/**
 * Validate a token at the boundary, so nothing downstream has to.
 *
 * A short token — from an earlier schema, or from before a slot was appended — is
 * accepted, with its missing positions read as off.
 *
 * @throws If `raw` is not a valid token, naming the expected form.
 */
export function parseRuleSetToken(raw: string): RuleSetToken {
  if (!isRuleSetToken(raw)) {
    throw new Error(
      `Invalid ruleset token: "${raw}". Expected either a schema-1 token of up to ` +
      `${TOKEN_FLAG_ORDER.length} characters (${TOKEN_FLAG_ORDER.join('')}), or "${SCHEMA_PREFIX}" ` +
      `followed by up to ${TOKEN_SLOTS.length} characters, each "${TOKEN_OFF_CHAR}" or the ` +
      `letter for its position (${TOKEN_SLOTS.map(slotChar).join('')}).`,
    )
  }
  return raw
}

/** Every piece crosses the seam in both modes. */
export const TOKEN_ALL_ON: RuleSetToken = tokenOf(RULES_ALL_ON)

/** Sliders only, both modes; the ruleset the engine is first built against. */
export const TOKEN_SLIDERS_ONLY: RuleSetToken = tokenOf(RULES_SLIDERS_ONLY)

/** Ordinary chess; the study's control and our external perft oracle. */
export const TOKEN_STANDARD_CHESS: RuleSetToken = tokenOf(RULES_STANDARD_CHESS)

/** The token used when nothing else is specified. */
export const DEFAULT_RULESET_TOKEN: RuleSetToken = tokenOf(DEFAULT_RULES)
