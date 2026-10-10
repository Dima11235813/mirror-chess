import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, parseSettings } from './settings'

/**
 * `localStorage` is untrusted input: it survives upgrades, it can be hand-edited, and a
 * value written by a future version will one day be read by an older one. These prove the
 * door holds — the load/save wrappers are exercised by the component tests, which have a
 * real `localStorage`.
 */
describe('parseSettings', () => {
  it('defaults to auto-submit, which is the behaviour the app has always had', () => {
    expect(DEFAULT_SETTINGS.autoSubmit).toBe(true)
  })

  it('keeps a well-formed value', () => {
    expect(parseSettings({ autoSubmit: false })).toEqual({ autoSubmit: false })
    expect(parseSettings({ autoSubmit: true })).toEqual({ autoSubmit: true })
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'autoSubmit'],
    ['a number', 7],
    ['an array', [{ autoSubmit: false }]],
    ['an empty object', {}],
  ])('falls back to the defaults for %s', (_label, value) => {
    expect(parseSettings(value)).toEqual(DEFAULT_SETTINGS)
  })

  it('ignores a field of the wrong type rather than coercing it', () => {
    // A stored `"false"` is a string, and the truthiness of a non-empty string would turn
    // a hand-edit or a sloppy writer into a silent behaviour change. Strings are not
    // booleans here, so it falls back.
    expect(parseSettings({ autoSubmit: 'false' })).toEqual({ autoSubmit: true })
    expect(parseSettings({ autoSubmit: 0 })).toEqual({ autoSubmit: true })
  })

  it('keeps the fields it understands and defaults the rest', () => {
    // Forward compatibility in the direction that actually happens: a newer version wrote
    // a field this one has never heard of. Drop it, keep what is recognisable, open.
    expect(parseSettings({ autoSubmit: false, boardTheme: 'walnut', soundOn: true }))
      .toEqual({ autoSubmit: false })
  })

  it('never returns a partial object, whatever it was given', () => {
    // The caller destructures `autoSubmit` without checking. A parser that can return
    // `{}` moves the problem rather than solving it.
    for (const value of [null, {}, { autoSubmit: 'yes' }, 42, []]) {
      expect(Object.keys(parseSettings(value))).toEqual(['autoSubmit'])
      expect(typeof parseSettings(value).autoSubmit).toBe('boolean')
    }
  })
})
