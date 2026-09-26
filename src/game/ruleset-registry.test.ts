import { describe, it, expect } from 'vitest'
import {
  defaultRuleSet,
  registeredRuleSets,
  resolveRuleSet,
  tryResolveRuleSet,
} from './ruleset-registry'
import {
  DEFAULT_RULESET_TOKEN,
  RULES_SLIDERS_ONLY,
  TOKEN_ALL_ON,
  TOKEN_SLIDERS_ONLY,
  TOKEN_STANDARD_CHESS,
  ruleSetOf,
  tokenOf,
} from './rules'

describe('the registry catalogues the notable rulesets', () => {
  it('names each one', () => {
    expect(resolveRuleSet(TOKEN_ALL_ON).name).toBe('Full mirror')
    expect(resolveRuleSet(TOKEN_SLIDERS_ONLY).name).toBe('Sliders only')
    expect(resolveRuleSet(TOKEN_STANDARD_CHESS).name).toBe('Standard chess')
  })

  it('marks the default, the official variants and the control', () => {
    expect(resolveRuleSet(TOKEN_ALL_ON).status).toBe('default')
    expect(resolveRuleSet(TOKEN_SLIDERS_ONLY).status).toBe('official')
    expect(resolveRuleSet(TOKEN_STANDARD_CHESS).status).toBe('control')
  })

  it('resolves human aliases, case-insensitively', () => {
    expect(resolveRuleSet('sliders').token).toBe(TOKEN_SLIDERS_ONLY)
    expect(resolveRuleSet('Standard').token).toBe(TOKEN_STANDARD_CHESS)
    expect(resolveRuleSet('FULL').token).toBe(TOKEN_ALL_ON)
  })

  it('agrees with the token encoding', () => {
    expect(resolveRuleSet(TOKEN_SLIDERS_ONLY).rules).toEqual(RULES_SLIDERS_ONLY)
    for (const definition of registeredRuleSets()) {
      expect(resolveRuleSet(definition.token).token).toBe(definition.token)
    }
  })

  it('has exactly one default', () => {
    expect(registeredRuleSets().filter(d => d.status === 'default')).toHaveLength(1)
    expect(defaultRuleSet().token).toBe(DEFAULT_RULESET_TOKEN)
  })
})

describe('the registry is a catalogue, not a gate', () => {
  it('resolves a valid but uncatalogued token as experimental', () => {
    // A bishop that may cross to capture but not to reposition — a purely tactical seam.
    const definition = resolveRuleSet('2:-B---------')

    expect(definition.status).toBe('experimental')
    expect(definition.rules.portal.B).toEqual({ quiet: false, capture: true })
    expect(definition.rules.portal.R).toEqual({ quiet: false, capture: false })
  })

  it('resolves an uncatalogued schema-1 token too, widening it to both rights', () => {
    const definition = resolveRuleSet('B-----')

    expect(definition.status).toBe('experimental')
    expect(definition.rules.portal.B).toEqual({ quiet: true, capture: true })
  })

  it('gives an uncatalogued permutation a usable name', () => {
    expect(resolveRuleSet('---N--').name.length).toBeGreaterThan(0)
  })

  it('still rejects genuine nonsense', () => {
    expect(() => resolveRuleSet('not-a-token')).toThrow(/Invalid ruleset token/)
    expect(() => resolveRuleSet('QRB---')).toThrow(/Invalid ruleset token/)
  })
})

describe('resolving untrusted input', () => {
  it('returns null rather than throwing, for URLs and stored fields', () => {
    expect(tryResolveRuleSet(null)).toBeNull()
    expect(tryResolveRuleSet(undefined)).toBeNull()
    expect(tryResolveRuleSet('')).toBeNull()
    expect(tryResolveRuleSet('nonsense')).toBeNull()
    expect(tryResolveRuleSet('QRB---')).toBeNull()
  })

  it('resolves anything valid, catalogued or not', () => {
    expect(tryResolveRuleSet(TOKEN_SLIDERS_ONLY)?.token).toBe(TOKEN_SLIDERS_ONLY)
    expect(tryResolveRuleSet('sliders')?.token).toBe(TOKEN_SLIDERS_ONLY)
    expect(tryResolveRuleSet('B-----')?.status).toBe('experimental')
  })
})

describe('standard versus catalogued (spec §2.1)', () => {
  // Two independent facts: `status` says whether we have named a ruleset, `standard`
  // says whether it obeys the rule that a piece attacks exactly where it can move.
  it('marks every catalogued ruleset standard', () => {
    for (const definition of registeredRuleSets()) expect(definition.standard).toBe(true)
  })

  it('resolves an uncatalogued but standard permutation as standard', () => {
    const knightOnly = resolveRuleSet(tokenOf(ruleSetOf(['N'])))

    expect(knightOnly.status).toBe('experimental')
    expect(knightOnly.standard).toBe(true)
  })

  it('resolves a non-standard permutation rather than rejecting it, and says why', () => {
    // A king that crosses quietly but cannot capture across: the case §2.1 forbids.
    const quietKingOnly = resolveRuleSet('2:--------k--')

    expect(quietKingOnly.standard).toBe(false)
    expect(quietKingOnly.description).toContain('non-standard')
  })

  it('still accepts a non-standard token from untrusted input, so a shared link keeps working', () => {
    expect(tryResolveRuleSet('2:--------k--')?.standard).toBe(false)
  })
})
