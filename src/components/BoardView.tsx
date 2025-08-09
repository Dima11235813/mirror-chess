import { useMemo, useState } from 'react'
import type { GameState, Coord, Move } from '../game/types'
import { coordEq, sameCoord } from '../game/coord'
import { algebraic } from '../game/coord'
import { legalMovesFor } from '../game/moves'

export function BoardView({ state, onMove }: { state: GameState; onMove: (m: Move) => void }) {
  const [selected, setSelected] = useState<Coord | null>(null)
  const legal = useMemo(() => (selected ? legalMovesFor(state, selected) : []), [state, selected])

  const clickSquare = (c: Coord) => {
    if (selected) {
      const m = legal.find(m => sameCoord(m.to, c))
      if (m) { onMove(m); setSelected(null); return }
    }
    const piece = state.board[coordIndex(c)]
    if (piece && piece.color === state.turn) setSelected(c)
    else setSelected(null)
  }

  return (
    <div className="board">
      {Array.from({ length: 8 * 8 }).map((_, i) => {
        const c: Coord = { r: 7 - Math.floor(i / 8), f: i % 8 }
        const piece = state.board[coordIndex(c)]
        const isLight = (c.r + c.f) % 2 === 0
        const isSelected = selected && coordEq(selected, c)
        const hint = legal.some(m => sameCoord(m.to, c))
        return (
          <button
            key={i}
            className={`sq ${isLight ? 'light' : 'dark'} ${isSelected ? 'sel' : ''}`}
            onClick={() => clickSquare(c)}
            aria-label={`Square ${algebraic(c)} ${piece ? pieceToGlyph(piece) : ''}`}
          >
            <div className="glyph">{piece ? pieceToGlyph(piece) : ''}</div>
            {hint && <div className="hint" />}
          </button>
        )
      })}
    </div>
  )
}

function pieceToGlyph(p: { kind: string; color: 'white' | 'black' }): string {
  const map: Record<string, [string, string]> = {
    K: ['♔', '♚'], Q: ['♕', '♛'], R: ['♖', '♜'], B: ['♗', '♝'], N: ['♘', '♞'], P: ['♙', '♟']
  }
  return p.color === 'white' ? map[p.kind][0] : map[p.kind][1]
}

function coordIndex(c: Coord): number { return c.r * 8 + c.f }


