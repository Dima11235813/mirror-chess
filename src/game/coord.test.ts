import { describe, it, expect } from 'vitest'
import { mirrorFile, algebraic } from './coord'

describe('coord utils', () => {
  it('mirrors files correctly', () => {
    expect(mirrorFile({ f: 0, r: 0 })).toEqual({ f: 7, r: 0 })
    expect(mirrorFile({ f: 3, r: 4 })).toEqual({ f: 4, r: 4 })
  })
  it('algebraic', () => {
    expect(algebraic({ f: 0, r: 0 })).toBe('a1')
    expect(algebraic({ f: 7, r: 7 })).toBe('h8')
  })
})


