import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RULES,
  DEFAULT_RULESET_TOKEN,
  RULES_ALL_ON,
  RULES_SLIDERS_ONLY,
  RULES_STANDARD_CHESS,
  TOKEN_ALL_ON,
  TOKEN_FLAG_ORDER,
  TOKEN_SLIDERS_ONLY,
  TOKEN_STANDARD_CHESS,
  isRuleSetToken,
  isStandardRuleSet,
  parseRuleSetToken,
  portalCaptures,
  portalEnabled,
  portalQuiet,
  ruleSetFrom,
  ruleSetOf,
  rulesOf,
  standardRuleSetTokens,
  tokenOf,
  type RuleSetToken,
} from './rules'
import { fromPiecesSpec } from './setup'
import { legalMovesFor } from './moves'
import { attacksFrom } from './attacks'
import { algebraic, parseAlgebraic } from './coord'
import type { Kind } from './types'

/** Every one of the 64 permutations, as canonical tokens. */
const ALL_TOKENS: readonly RuleSetToken[] = Array.from({ length: 64 }, (_, mask) =>
  tokenOf(ruleSetOf(TOKEN_FLAG_ORDER.filter((_k, i) => (mask & (1 << i)) !== 0))),
)

const mirrorDestinations = (spec: string, square: string, rules = DEFAULT_RULES): string[] =>
  legalMovesFor(fromPiecesSpec(spec, 'white', rules), parseAlgebraic(square))
    .filter(m => m.crossedSeam)
    .map(m => algebraic(m.to))
    .sort()

const attacked = (spec: string, square: string, rules = DEFAULT_RULES): string[] =>
  [...new Set(attacksFrom(fromPiecesSpec(spec, 'white', rules), parseAlgebraic(square)).map(algebraic))].sort()

describe('tokens', () => {
  it('names the well-known rulesets', () => {
    // Lowercase = may move across the seam, uppercase = may capture across it (§12).
    expect(TOKEN_ALL_ON).toBe('2:bBrRqQnNkKP')
    expect(TOKEN_SLIDERS_ONLY).toBe('2:bBrRqQ-----')
    expect(TOKEN_STANDARD_CHESS).toBe('2:-----------')
    expect(DEFAULT_RULESET_TOKEN).toBe(TOKEN_ALL_ON)
  })

  it('reads a schema-1 token as both rights, preserving what it meant when written', () => {
    // Before §12 a piece that crossed did so in both modes, so the expansion is a
    // widening rather than a redefinition.
    const legacy = parseRuleSetToken('BRQ---')

    expect(rulesOf(legacy)).toEqual(RULES_SLIDERS_ONLY)
    expect(tokenOf(rulesOf(legacy))).toBe(TOKEN_SLIDERS_ONLY)
  })

  it('rejects a schema-2 token whose letters are in the wrong slots', () => {
    expect(isRuleSetToken('2:BbrRqQnNkKP')).toBe(false) // capture/quiet swapped for B
    expect(isRuleSetToken('2:bBrRqQnNkKp')).toBe(false) // pawn has no quiet slot
  })

  it('round-trips all 64 permutations', () => {
    for (const token of ALL_TOKENS) expect(tokenOf(rulesOf(token))).toBe(token)
  })

  it('produces 64 distinct tokens', () => {
    expect(new Set(ALL_TOKENS).size).toBe(64)
  })

  it('is positional, not a set — a letter in the wrong place is invalid', () => {
    expect(isRuleSetToken('BRQ---')).toBe(true)
    expect(isRuleSetToken('QRB---')).toBe(false)
    expect(isRuleSetToken('-RQ---')).toBe(true)
  })

  it('rejects malformed tokens with a useful message', () => {
    for (const bad of ['', 'BRQNKPX', 'BRQNK?', 'brq---', 'BRQ  --']) {
      expect(isRuleSetToken(bad)).toBe(false)
      expect(() => parseRuleSetToken(bad)).toThrow(/Invalid ruleset token/)
    }
  })

  it('accepts a short token from an earlier schema, reading missing positions as off', () => {
    // Forward compatibility: this is how a token minted before a 7th flag existed keeps
    // its meaning. Canonicalising it fills the absent positions with the off marker.
    const short = parseRuleSetToken('BRQ')

    expect(rulesOf(short)).toEqual(RULES_SLIDERS_ONLY)
    expect(tokenOf(rulesOf(short))).toBe(TOKEN_SLIDERS_ONLY)
  })

  it('exposes a flag order that must only ever be appended to', () => {
    expect([...TOKEN_FLAG_ORDER]).toEqual(['B', 'R', 'Q', 'N', 'K', 'P'])
  })
})

describe('rulesets', () => {
  it('describes which pieces cross', () => {
    expect(portalEnabled(RULES_SLIDERS_ONLY, 'B')).toBe(true)
    expect(portalEnabled(RULES_SLIDERS_ONLY, 'N')).toBe(false)
    expect(portalEnabled(RULES_STANDARD_CHESS, 'Q')).toBe(false)
    expect(portalEnabled(RULES_ALL_ON, 'P')).toBe(true)
  })

  it('covers every piece kind, so a lookup can never be undefined', () => {
    const kinds: readonly Kind[] = ['K', 'Q', 'R', 'B', 'N', 'P']
    for (const kind of kinds) expect(typeof portalEnabled(RULES_ALL_ON, kind)).toBe('boolean')
  })
})

describe('§12 quiet and capture are separate powers', () => {
  const QUIET_ONLY = { quiet: true, capture: false }
  const CAPTURE_ONLY = { quiet: false, capture: true }

  it('a quiet-only bishop reaches empty far-side squares', () => {
    const rules = ruleSetFrom({ B: QUIET_ONLY })

    expect(mirrorDestinations('w:Bb3', 'b3', rules))
      .toEqual(['d8', 'e7', 'f6', 'g1', 'g5', 'h2', 'h4'])
  })

  it('a quiet-only bishop cannot take what it can reach', () => {
    const rules = ruleSetFrom({ B: QUIET_ONLY })

    // h4 is the portal mouth's first square and holds an enemy — reachable, not takeable.
    expect(mirrorDestinations('w:Bb3; b:Rh4', 'b3', rules)).not.toContain('h4')
  })

  it('a capture-only bishop takes what it cannot otherwise reach', () => {
    const rules = ruleSetFrom({ B: CAPTURE_ONLY })

    expect(mirrorDestinations('w:Bb3; b:Rh4', 'b3', rules)).toEqual(['h4'])
    // ...and offers nothing on an empty board, having no landing right.
    expect(mirrorDestinations('w:Bb3', 'b3', rules)).toEqual([])
  })

  it('§12.2 check follows capture, not quiet movement', () => {
    const quiet = ruleSetFrom({ B: QUIET_ONLY })
    const capture = ruleSetFrom({ B: CAPTURE_ONLY })

    // The same bishop, the same king, opposite verdicts.
    expect(fromPiecesSpec('w:Bb3; b:Kg1', 'black', quiet).inCheck).toBe(false)
    expect(fromPiecesSpec('w:Bb3; b:Kg1', 'black', capture).inCheck).toBe(true)
  })

  it('§12.7 attack generation ignores the quiet right entirely', () => {
    // A piece that may only *move* across the seam attacks nothing across it.
    expect(attacked('w:Bb3', 'b3', ruleSetFrom({ B: QUIET_ONLY })))
      .toEqual(attacked('w:Bb3', 'b3', RULES_STANDARD_CHESS))
  })

  it('§12.4 two kings may stand seam-adjacent when kings do not capture across', () => {
    // Symmetric by construction: the rights are per piece KIND, so both kings share
    // them. Neither attacks the other, so neither is in check — and checkmate keeps
    // its ordinary meaning throughout.
    const rules = ruleSetFrom({ K: QUIET_ONLY })

    expect(fromPiecesSpec('w:Ka4; b:Kh4', 'white', rules).inCheck).toBe(false)
    expect(fromPiecesSpec('w:Ka4; b:Kh4', 'black', rules).inCheck).toBe(false)
    // Neither can take the other across the seam either.
    expect(mirrorDestinations('w:Ka4; b:Kh4', 'a4', rules)).not.toContain('h4')
  })

  it('a pawn has only a capture right, since a push cannot cross the seam', () => {
    const rules = ruleSetFrom({ P: CAPTURE_ONLY })

    expect(mirrorDestinations('w:Pa4; b:Rh5', 'a4', rules)).toEqual(['h5'])
    // There is no representable quiet right to switch on for a pawn.
    expect(rulesOf(tokenOf(ruleSetFrom({ P: { quiet: true, capture: true } }))).portal.P)
      .toEqual({ quiet: false, capture: true })
  })
})

describe('a fully disabled piece removes moves and attacks together', () => {
  // The failure this guards against: suppressing the move but not the attack, which
  // would leave a king "in check" from a piece unable to legally reach it.

  it.each([
    ['B', 'w:Bb3', 'b3'],
    ['R', 'w:Ra4; b:Pc4', 'a4'],
    ['Q', 'w:Qb3', 'b3'],
    ['N', 'w:Na3', 'a3'],
    ['K', 'w:Ka3', 'a3'],
  ])('%s stops crossing when its flag is off', (kind, spec, square) => {
    const on = ruleSetOf([kind as Kind])
    const off = RULES_STANDARD_CHESS

    expect(mirrorDestinations(spec, square, on).length).toBeGreaterThan(0)
    expect(mirrorDestinations(spec, square, off)).toEqual([])
  })

  it('a bishop with its flag off attacks exactly the ordinary diagonals', () => {
    expect(attacked('w:Bb3', 'b3', RULES_STANDARD_CHESS))
      .toEqual(['a2', 'a4', 'c2', 'c4', 'd1', 'd5', 'e6', 'f7', 'g8'].sort())
  })

  it('a knight with its flag off attacks only its on-board L-squares', () => {
    expect(attacked('w:Na3', 'a3', RULES_STANDARD_CHESS)).toEqual(['b1', 'b5', 'c2', 'c4'].sort())
  })

  it('a pawn with its flag off attacks only the diagonal that exists', () => {
    expect(attacked('w:Pa4', 'a4', RULES_STANDARD_CHESS)).toEqual(['b5'])
  })

  it('no piece gives check across the seam under standard chess', () => {
    // Each of these is check under the default rules; none is under `------`.
    for (const spec of ['w:Bb3; b:Kg1', 'w:Na3; b:Kh5', 'w:Pa4; b:Kh5']) {
      expect(fromPiecesSpec(spec, 'black', RULES_STANDARD_CHESS).inCheck).toBe(false)
      expect(fromPiecesSpec(spec, 'black', RULES_ALL_ON).inCheck).toBe(true)
    }
  })
})

describe('flags are independent', () => {
  it('enabling the bishop does not let the rook or queen cross', () => {
    const bishopOnly = ruleSetOf(['B'])

    expect(mirrorDestinations('w:Bb3', 'b3', bishopOnly).length).toBeGreaterThan(0)
    expect(mirrorDestinations('w:Ra4; b:Pc4', 'a4', bishopOnly)).toEqual([])
    expect(mirrorDestinations('w:Qb3', 'b3', bishopOnly)).toEqual([])
  })

  it('the queen crosses on its own flag, not the bishop or rook flags', () => {
    const queenOnly = ruleSetOf(['Q'])
    const bishopAndRook = ruleSetOf(['B', 'R'])

    expect(mirrorDestinations('w:Qb3', 'b3', queenOnly).length).toBeGreaterThan(0)
    expect(mirrorDestinations('w:Qb3', 'b3', bishopAndRook)).toEqual([])
  })

  it('sliders-only leaves the steppers standard, and vice versa', () => {
    expect(mirrorDestinations('w:Bb3', 'b3', RULES_SLIDERS_ONLY).length).toBeGreaterThan(0)
    expect(mirrorDestinations('w:Na3', 'a3', RULES_SLIDERS_ONLY)).toEqual([])

    const steppersOnly = ruleSetOf(['N', 'K', 'P'])
    expect(mirrorDestinations('w:Na3', 'a3', steppersOnly).length).toBeGreaterThan(0)
    expect(mirrorDestinations('w:Bb3', 'b3', steppersOnly)).toEqual([])
  })
})

describe('§2.1 standard rulesets — a piece attacks exactly where it can move', () => {
  // The seam expands the geometry a piece moves through; it does not change what chess
  // says about that piece. So a non-pawn piece holds both portal rights or neither, and
  // the pawn holds capture-only because chess itself separates its move from its attack.
  it('accepts every ruleset built from whole-piece crossings', () => {
    for (const token of ALL_TOKENS) expect(isStandardRuleSet(rulesOf(token))).toBe(true)
  })

  it('rejects a piece that may move across but not capture across', () => {
    // The case that forced the rule: such a king crosses into a square it does not
    // attack, so two kings may stand seam-adjacent and neither is in check.
    expect(isStandardRuleSet(ruleSetFrom({ K: { quiet: true, capture: false } }))).toBe(false)
    expect(isStandardRuleSet(ruleSetFrom({ B: { quiet: true, capture: false } }))).toBe(false)
  })

  it('rejects a piece that may capture across but not move across', () => {
    expect(isStandardRuleSet(ruleSetFrom({ N: { quiet: false, capture: true } }))).toBe(false)
    expect(isStandardRuleSet(ruleSetFrom({ Q: { quiet: false, capture: true } }))).toBe(false)
  })

  it("accepts the pawn's capture-only portal, because a push has no file component", () => {
    // Not an exception to the rule but an instance of it: a pawn attacks its diagonals
    // and moves straight ahead in ordinary chess too (§12.4).
    expect(isStandardRuleSet(ruleSetFrom({ P: { quiet: false, capture: true } }))).toBe(true)
  })

  it('enumerates exactly the 64 standard rulesets', () => {
    const tokens = standardRuleSetTokens()

    expect(tokens).toHaveLength(64)
    expect(new Set(tokens).size).toBe(64)
    for (const token of tokens) expect(isStandardRuleSet(rulesOf(token))).toBe(true)
    expect([...tokens].sort()).toEqual([...ALL_TOKENS].sort())
  })

  it('names the three catalogued rulesets among them', () => {
    const tokens = standardRuleSetTokens()

    expect(tokens).toContain(TOKEN_ALL_ON)
    expect(tokens).toContain(TOKEN_SLIDERS_ONLY)
    expect(tokens).toContain(TOKEN_STANDARD_CHESS)
  })

  it('still parses a non-standard token rather than rejecting it, so no saved link breaks', () => {
    // ADR 0004: a token's meaning is fixed forever. What changed is which rulesets are
    // *standard*, never which ones parse.
    const quietKingOnly = parseRuleSetToken('2:--------k--')

    expect(isRuleSetToken('2:--------k--')).toBe(true)
    expect(portalQuiet(rulesOf(quietKingOnly), 'K')).toBe(true)
    expect(portalCaptures(rulesOf(quietKingOnly), 'K')).toBe(false)
    expect(isStandardRuleSet(rulesOf(quietKingOnly))).toBe(false)
  })
})
