import { describe, it, expect } from 'vitest'
import { describeSquare, hintClassesFor, type SquareHintKind } from './square-presentation'
import { SquareHintClass } from './selectors'
import type { Piece } from '@game/types'

const WHITE_PAWN: Piece = { kind: 'P', color: 'white' }
const BLACK_KING: Piece = { kind: 'K', color: 'black' }

const base = {
  square: 'e4',
  piece: null,
  hint: null,
  checkRole: null,
  selected: false,
} as const

const ALL_KINDS: readonly SquareHintKind[] = [
  'move', 'capture', 'mirror-move', 'mirror-capture', 'en-passant',
]

describe('hintClassesFor', () => {
  it('always includes the base hint class', () => {
    for (const kind of ALL_KINDS) {
      expect(hintClassesFor(kind).split(' ')).toContain(SquareHintClass.Hint)
    }
  })

  it('marks a plain move with nothing else', () => {
    expect(hintClassesFor('move')).toBe(SquareHintClass.Hint)
  })

  it('distinguishes a portal move from an ordinary one', () => {
    expect(hintClassesFor('mirror-move')).toContain(SquareHintClass.Mirror)
    expect(hintClassesFor('move')).not.toContain(SquareHintClass.Mirror)
  })

  it('marks a portal capture as both mirror and capture', () => {
    const classes = hintClassesFor('mirror-capture').split(' ')

    expect(classes).toContain(SquareHintClass.Mirror)
    expect(classes).toContain(SquareHintClass.Capture)
  })
})

describe('describeSquare', () => {
  it('names an empty square', () => {
    expect(describeSquare(base)).toBe('e4, empty')
  })

  it('names the occupying piece in words, not a glyph', () => {
    expect(describeSquare({ ...base, piece: WHITE_PAWN })).toBe('e4, white pawn')
    expect(describeSquare({ ...base, square: 'e8', piece: BLACK_KING })).toBe('e8, black king')
  })

  it('announces every hint kind', () => {
    for (const kind of ALL_KINDS) {
      expect(describeSquare({ ...base, hint: kind }).length).toBeGreaterThan('e4, empty'.length)
    }
  })

  it('distinguishes a portal move non-visually', () => {
    expect(describeSquare({ ...base, square: 'h4', hint: 'mirror-move' }))
      .toBe('h4, empty, legal mirror move through the seam')
    expect(describeSquare({ ...base, hint: 'move' })).toBe('e4, empty, legal move')
  })

  it('announces the checked king and the piece giving check', () => {
    expect(describeSquare({ ...base, square: 'g1', piece: BLACK_KING, checkRole: 'king-in-check' }))
      .toBe('g1, black king, in check')
    expect(describeSquare({ ...base, square: 'b3', piece: WHITE_PAWN, checkRole: 'checker' }))
      .toBe('b3, white pawn, giving check')
  })

  it('distinguishes mate and stalemate from an ordinary check', () => {
    const mated = describeSquare({ ...base, piece: BLACK_KING, checkRole: 'king-mated' })
    const stalemated = describeSquare({ ...base, piece: BLACK_KING, checkRole: 'king-stalemated' })
    const checked = describeSquare({ ...base, piece: BLACK_KING, checkRole: 'king-in-check' })

    expect(new Set([mated, stalemated, checked]).size).toBe(3)
  })

  it('announces selection', () => {
    expect(describeSquare({ ...base, piece: WHITE_PAWN, selected: true }))
      .toBe('e4, white pawn, selected')
  })

  it('combines roles in a stable order', () => {
    expect(describeSquare({
      ...base, square: 'h4', piece: BLACK_KING, checkRole: 'king-in-check', hint: 'capture', selected: true,
    })).toBe('h4, black king, selected, in check, legal capture')
  })
})
