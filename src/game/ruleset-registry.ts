import {
  DEFAULT_RULESET_TOKEN,
  TOKEN_ALL_ON,
  TOKEN_SLIDERS_ONLY,
  TOKEN_STANDARD_CHESS,
  RULESET_SCHEMA,
  isRuleSetToken,
  isStandardRuleSet,
  parseRuleSetToken,
  rulesOf,
  type RuleSet,
  type RuleSetToken,
} from './rules'

/**
 * THE RULESET REGISTRY — names and metadata for known permutations.
 *
 * **What is this?** A catalogue mapping ruleset tokens to the human-facing facts about
 * them: a name, a description, whether the variant is official, and eventually the
 * balance metrics the variant study measures.
 *
 * **Why is it here?** A token encodes the flags but nothing else. It cannot say "this
 * one is ordinary chess and we use it as our correctness oracle", and it has nowhere to
 * record that a permutation scored 51.2% for White over a thousand games.
 *
 * **What is subtle?** The registry adds *meaning*, never the *ability to exist*. A
 * syntactically valid token always resolves whether or not it is catalogued — see
 * {@link resolveRuleSet}. If registration were required, nobody could share an
 * unregistered variant, which would defeat the goal of players proposing their own.
 *
 * This file is deliberately plain data. When the variant study begins writing measured
 * metrics back, it becomes a JSON document loaded here rather than a literal.
 */

/** Balance metrics measured for a ruleset by self-play. Absent until the study runs. */
export interface RuleSetMetrics {
  /** White's score over the sample, draws counting a half. */
  readonly whiteScore: number
  readonly drawRate: number
  readonly games: number
}

/** Everything known about a ruleset permutation. */
export interface RuleSetDefinition {
  readonly token: RuleSetToken
  readonly name: string
  /** Short names a human may type instead of the token. */
  readonly aliases: readonly string[]
  readonly description: string
  readonly rules: RuleSet
  /** Which version of the token schema minted this token — see `rules.ts`. */
  readonly schema: number
  readonly status: RuleSetStatus
  /**
   * Is this one of the 64 rulesets the game offers (spec §2.1)?
   *
   * Orthogonal to {@link status}, which records whether we have *catalogued* a ruleset.
   * This records whether it obeys the rule that a piece attacks exactly where it can
   * move. A ruleset can be uncatalogued but standard (most of the 64), and a non-standard
   * one is never offered by the UI or measured by the study — but still parses and still
   * plays, because a token's meaning is fixed forever (ADR 0004).
   */
  readonly standard: boolean
  readonly metrics?: RuleSetMetrics
}

export type RuleSetStatus =
  /** The game played when nothing else is specified. */
  | 'default'
  /** A named variant we consider part of the project. */
  | 'official'
  /** Ordinary chess: the study's control and our external correctness oracle. */
  | 'control'
  /** Any other permutation — valid and playable, simply not catalogued. */
  | 'experimental'

const DEFINITIONS: readonly RuleSetDefinition[] = [
  {
    token: TOKEN_ALL_ON,
    name: 'Full mirror',
    aliases: ['full', 'all'],
    description:
      'Every piece crosses the seam in both modes — it may move across and capture across. ' +
      'Sliders cross by transit (spec §4), steppers by wrapping the file (§11).',
    rules: rulesOf(TOKEN_ALL_ON),
    schema: RULESET_SCHEMA,
    status: 'default',
    standard: true,
  },
  {
    token: TOKEN_SLIDERS_ONLY,
    name: 'Sliders only',
    aliases: ['sliders'],
    description:
      'Bishop, rook and queen cross the seam in both modes; knight, king and pawn play ' +
      'ordinary chess. The ruleset the engine is built against.',
    rules: rulesOf(TOKEN_SLIDERS_ONLY),
    schema: RULESET_SCHEMA,
    status: 'official',
    standard: true,
  },
  {
    token: TOKEN_STANDARD_CHESS,
    name: 'Standard chess',
    aliases: ['standard', 'chess'],
    description:
      'No piece crosses the seam, so the game is ordinary chess. Used as the control for ' +
      'the variant study and as an external correctness oracle via published perft counts.',
    rules: rulesOf(TOKEN_STANDARD_CHESS),
    schema: RULESET_SCHEMA,
    status: 'control',
    standard: true,
  },
]

const BY_TOKEN: ReadonlyMap<string, RuleSetDefinition> =
  new Map(DEFINITIONS.map(d => [d.token as string, d]))

const BY_ALIAS: ReadonlyMap<string, RuleSetDefinition> =
  new Map(DEFINITIONS.flatMap(d => d.aliases.map(a => [a.toLowerCase(), d] as const)))

/** Every catalogued ruleset, in declaration order. */
export function registeredRuleSets(): readonly RuleSetDefinition[] {
  return DEFINITIONS
}

/**
 * Resolve a token or a registered alias to its definition.
 *
 * A catalogued token returns its entry. A valid but uncatalogued token is synthesised
 * as `experimental` — the registry is a catalogue, not a gate.
 *
 * @param raw A canonical token (`"BRQ---"`) or a registered alias (`"sliders"`).
 * @throws If `raw` is neither a known alias nor a syntactically valid token.
 */
export function resolveRuleSet(raw: string): RuleSetDefinition {
  const byAlias = BY_ALIAS.get(raw.toLowerCase())
  if (byAlias) return byAlias

  const token = parseRuleSetToken(raw)
  return BY_TOKEN.get(token as string) ?? experimentalDefinition(token)
}

/**
 * Resolve untrusted input — a URL parameter, a stored field — falling back rather than
 * throwing.
 *
 * @returns The resolved definition, or `null` if `raw` names nothing valid.
 */
export function tryResolveRuleSet(raw: string | null | undefined): RuleSetDefinition | null {
  if (raw === null || raw === undefined) return null
  if (BY_ALIAS.has(raw.toLowerCase())) return resolveRuleSet(raw)
  return isRuleSetToken(raw) ? resolveRuleSet(raw) : null
}

/** The definition used when nothing is specified. */
export function defaultRuleSet(): RuleSetDefinition {
  return resolveRuleSet(DEFAULT_RULESET_TOKEN)
}

function experimentalDefinition(token: RuleSetToken): RuleSetDefinition {
  const rules = rulesOf(token)
  return {
    token,
    name: `Variant ${token}`,
    aliases: [],
    description: isStandardRuleSet(rules)
      ? 'An uncatalogued permutation. Valid and playable, simply unnamed.'
      : 'A non-standard permutation: some piece may move across the seam without ' +
        'attacking across it, or the reverse (spec §2.1). Valid and playable, but outside ' +
        'the 64 rulesets the game offers — see prj-mgmt/epics/rules/adjacent-kings.md.',
    rules,
    schema: RULESET_SCHEMA,
    status: 'experimental',
    standard: isStandardRuleSet(rules),
  }
}
