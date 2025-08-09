// =============================
// Mirror Chess – Monorepo-in-a-file layout
// Paste these into files with the same paths.
// Tech: Ionic React + Vite + TypeScript + Vitest
// Focus: SOLID, FP-leaning utilities, strong types, unit tests
// =============================

// --- package.json ---
{
  "name": "mirror-chess",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest --run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@ionic/react": "^9.0.0",
    "@ionic/react-router": "^9.0.0",
    "ionicons": "^7.2.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.23.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}

// --- tsconfig.json ---
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "tests"]
}

// --- vite.config.ts ---
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })

// --- src/main.tsx ---
import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { IonApp, IonContent, setupIonicReact } from '@ionic/react'
import App from './App'
import './styles.css'
setupIonicReact()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IonApp>
      <IonContent>
        <App />
      </IonContent>
    </IonApp>
  </StrictMode>
)

// --- index.html ---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Mirror Chess v0.1</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

// --- src/App.tsx ---
import { useState } from 'react'
import { IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/react'
import { BoardView } from './components/BoardView'
import { initialPosition } from './game/setup'
import { reduceMove } from './game/reducer'
import type { GameState, Coord, Move } from './game/types'

export default function App() {
  const [state, setState] = useState<GameState>(() => initialPosition())

  const onMove = (m: Move) => setState(s => reduceMove(s, m))
  const onReset = () => setState(initialPosition())

  return (
    <div className="app">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mirror Chess v0.1</IonTitle>
          <div className="actions">
            <IonButton onClick={onReset}>Reset</IonButton>
          </div>
        </IonToolbar>
      </IonHeader>
      <BoardView state={state} onMove={onMove} />
      <footer className="footer">
        <p>Turn: <strong>{state.turn}</strong>{state.inCheck ? ' (check)' : ''}</p>
      </footer>
    </div>
  )
}

// --- src/components/BoardView.tsx ---
import { useMemo, useState } from 'react'
import type { GameState, Coord, Move } from '../game/types'
import { coordEq, forEachSquare, sameCoord } from '../game/coord'
import { algebraic, insideBoard } from '../game/coord'
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

// --- src/styles.css ---
:root { --cell: min(10vw, 56px); }
* { box-sizing: border-box; }
body, html, #root { height: 100%; margin: 0; }
.app { display: grid; grid-template-rows: auto 1fr auto; height: 100%; }
.board { width: calc(var(--cell) * 8); height: calc(var(--cell) * 8); margin: 12px auto; display: grid; grid-template-columns: repeat(8, 1fr); border: 2px solid #333; border-radius: 12px; overflow: hidden; }
.sq { position: relative; width: 100%; height: var(--cell); border: 0; display: grid; place-items: center; font-size: calc(var(--cell) * 0.6); }
.sq.light { background: #f0d9b5; }
.sq.dark { background: #b58863; }
.sq.sel { outline: 3px solid #2dd4bf; z-index: 1; }
.glyph { pointer-events: none; }
.hint { position: absolute; width: 30%; height: 30%; border-radius: 50%; background: rgba(45, 212, 191, 0.6); }
.footer { text-align: center; padding-bottom: env(safe-area-inset-bottom); }

// --- src/game/types.ts ---
/** Color of a side. */
export type Color = 'white' | 'black'
/** Files [0..7] left→right (a..h), Ranks [0..7] bottom→top from White's POV. */
export interface Coord { readonly f: number; readonly r: number }
export type Kind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'
export interface Piece { readonly kind: Kind; readonly color: Color }
export type Board = ReadonlyArray<Piece | null> // length 64
export interface Move { readonly from: Coord; readonly to: Coord; readonly special?: 'mirror' }
export interface GameState { readonly board: Board; readonly turn: Color; readonly inCheck: boolean }

// --- src/game/coord.ts ---
import type { Coord } from './types'
/** Convert coord → board index (0..63). */
export const toIndex = (c: Coord): number => c.r * 8 + c.f
/** Safe equality for coords. */
export const coordEq = (a: Coord | null, b: Coord | null): boolean => !!a && !!b && a.f === b.f && a.r === b.r
export const sameCoord = (a: Coord, b: Coord): boolean => a.f === b.f && a.r === b.r
/** Alphanumeric like "e4". */
export const algebraic = (c: Coord): string => String.fromCharCode(97 + c.f) + (c.r + 1)
/** True if inside 8x8. */
export const insideBoard = (c: Coord): boolean => c.f >= 0 && c.f < 8 && c.r >= 0 && c.r < 8
/** Mirror across the center vertical axis (files a↔h, b↔g, c↔f, d↔e). */
export const mirrorFile = (c: Coord): Coord => ({ f: 7 - c.f, r: c.r })
/** Iterate all squares (rank major). */
export const forEachSquare = (cb: (c: Coord) => void) => { for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) cb({ f, r }) }

// --- src/game/setup.ts ---
import type { Board, GameState, Piece } from './types'
import { toIndex } from './coord'

const W: Record<string, Piece> = { K: { kind: 'K', color: 'white' }, Q: { kind: 'Q', color: 'white' }, R: { kind: 'R', color: 'white' }, B: { kind: 'B', color: 'white' }, N: { kind: 'N', color: 'white' }, P: { kind: 'P', color: 'white' } }
const B: Record<string, Piece> = { K: { kind: 'K', color: 'black' }, Q: { kind: 'Q', color: 'black' }, R: { kind: 'R', color: 'black' }, B: { kind: 'B', color: 'black' }, N: { kind: 'N', color: 'black' }, P: { kind: 'P', color: 'black' } }

export const emptyBoard = (): Board => Array.from({ length: 64 }, () => null)

/** Standard chess initial placement. */
export const initialPosition = (): GameState => {
  const b = emptyBoard().slice()
  const place = (f: number, r: number, p: Piece) => { b[r * 8 + f] = p }
  // White
  ;[0,7].forEach(f => place(f, 0, W.R))
  ;[1,6].forEach(f => place(f, 0, W.N))
  ;[2,5].forEach(f => place(f, 0, W.B))
  place(3, 0, W.Q); place(4, 0, W.K)
  for (let f = 0; f < 8; f++) place(f, 1, W.P)
  // Black
  ;[0,7].forEach(f => place(f, 7, B.R))
  ;[1,6].forEach(f => place(f, 7, B.N))
  ;[2,5].forEach(f => place(f, 7, B.B))
  place(3, 7, B.Q); place(4, 7, B.K)
  for (let f = 0; f < 8; f++) place(f, 6, B.P)
  return { board: b, turn: 'white', inCheck: false }
}

// --- src/game/reducer.ts ---
import type { GameState, Move } from './types'
import { toIndex } from './coord'
import { legalMovesFor } from './moves'
import { sameCoord } from './coord'

/** Pure reducer for applying a move if legal. */
export function reduceMove(state: GameState, move: Move): GameState {
  const legal = legalMovesFor(state, move.from)
  const isLegal = legal.some(m => sameCoord(m.to, move.to) && m.special === move.special)
  if (!isLegal) return state
  const next = structuredClone(state)
  const fromI = toIndex(move.from), toI = toIndex(move.to)
  next.board[toI] = next.board[fromI]
  next.board[fromI] = null
  next.turn = state.turn === 'white' ? 'black' : 'white'
  // TODO: inCheck detection, captures already handled by overwrite
  return next
}

// --- src/game/moves.ts ---
import type { Board, Coord, GameState, Move, Piece } from './types'
import { toIndex, insideBoard, mirrorFile } from './coord'

/**
 * LEGAL MOVE GENERATION (minimal v0.1):
 * - Standard pseudo-legal moves for each piece (no castling/en passant yet).
 * - Mirror rule: A piece may also move to the exact file-mirror of its current square IF:
 *   - Path across the rank between from and mirror is unobstructed (sliding rule),
 *   - EXCEPTION: Knights may mirror regardless of intervening pieces (they jump),
 *   - Destination must be empty or contain opponent piece.
 */

export function legalMovesFor(state: GameState, from: Coord): Move[] {
  const piece = state.board[toIndex(from)]
  if (!piece || piece.color !== state.turn) return []
  const acc: Move[] = []
  switch (piece.kind) {
    case 'P': pushAll(acc, pawnMoves(state, from, piece)); break
    case 'N': pushAll(acc, knightMoves(state, from, piece)); break
    case 'B': pushAll(acc, slideMoves(state, from, piece, [ [1,1], [1,-1], [-1,1], [-1,-1] ])); break
    case 'R': pushAll(acc, slideMoves(state, from, piece, [ [1,0], [-1,0], [0,1], [0,-1] ])); break
    case 'Q': pushAll(acc, slideMoves(state, from, piece, [ [1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1] ])); break
    case 'K': pushAll(acc, kingMoves(state, from, piece)); break
  }
  // Mirror move
  const mirror = mirrorFile(from)
  if (!sameSquare(mirror, from)) {
    const pathClear = rankPathClear(state.board, from, mirror)
    const target = state.board[toIndex(mirror)]
    const canCapture = !target || target.color !== piece.color
    const knightException = piece.kind === 'N' // knights may mirror regardless of path
    if (canCapture && (pathClear || knightException)) acc.push({ from, to: mirror, special: 'mirror' })
  }
  return acc
}

function pushAll<T>(out: T[], xs: T[]): void { for (const x of xs) out.push(x) }
function sameSquare(a: Coord, b: Coord): boolean { return a.f === b.f && a.r === b.r }

function pawnMoves(state: GameState, from: Coord, p: Piece): Move[] {
  const dir = p.color === 'white' ? 1 : -1
  const startRank = p.color === 'white' ? 1 : 6
  const res: Move[] = []
  const fwd: Coord = { f: from.f, r: from.r + dir }
  if (insideBoard(fwd) && !state.board[toIndex(fwd)]) res.push({ from, to: fwd })
  const fwd2: Coord = { f: from.f, r: from.r + 2 * dir }
  if (from.r === startRank && !state.board[toIndex(fwd)] && !state.board[toIndex(fwd2)]) res.push({ from, to: fwd2 })
  for (const df of [-1, 1]) {
    const cap: Coord = { f: from.f + df, r: from.r + dir }
    if (insideBoard(cap)) {
      const t = state.board[toIndex(cap)]
      if (t && t.color !== p.color) res.push({ from, to: cap })
    }
  }
  return res
}

function knightMoves(state: GameState, from: Coord, p: Piece): Move[] {
  const deltas = [ [1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2] ]
  const res: Move[] = []
  for (const [df, dr] of deltas) {
    const to: Coord = { f: from.f + df, r: from.r + dr }
    if (!insideBoard(to)) continue
    const t = state.board[toIndex(to)]
    if (!t || t.color !== p.color) res.push({ from, to })
  }
  return res
}

function kingMoves(state: GameState, from: Coord, p: Piece): Move[] {
  const res: Move[] = []
  for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) {
    if (df === 0 && dr === 0) continue
    const to: Coord = { f: from.f + df, r: from.r + dr }
    if (!insideBoard(to)) continue
    const t = state.board[toIndex(to)]
    if (!t || t.color !== p.color) res.push({ from, to })
  }
  return res
}

function slideMoves(state: GameState, from: Coord, p: Piece, dirs: Array<[number, number]>): Move[] {
  const res: Move[] = []
  const board = state.board
  for (const [df, dr] of dirs) {
    let f = from.f + df, r = from.r + dr
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const to: Coord = { f, r }
      const t = board[toIndex(to)]
      if (!t) res.push({ from, to })
      else { if (t.color !== p.color) res.push({ from, to }); break }
      f += df; r += dr
    }
  }
  return res
}

/** True if every square strictly between a and b on the same rank is empty. */
function rankPathClear(board: Board, a: Coord, b: Coord): boolean {
  if (a.r !== b.r) return false
  const lo = Math.min(a.f, b.f) + 1
  const hi = Math.max(a.f, b.f) - 1
  for (let f = lo; f <= hi; f++) if (board[a.r * 8 + f]) return false
  return true
}

// --- tests/mirror.test.ts ---
import { describe, it, expect } from 'vitest'
import { initialPosition } from '../src/game/setup'
import { legalMovesFor } from '../src/game/moves'
import type { Coord } from '../src/game/types'

const c = (f: number, r: number): Coord => ({ f, r })

describe('mirror rule', () => {
  it('rook can mirror across empty rank path', () => {
    const s = initialPosition()
    // clear b1..g1 manually (simulate empty path)
    const s2 = { ...s, board: s.board.slice() }
    for (let f = 1; f <= 6; f++) s2.board[1 * 8 + f] = null // row r=1 is pawns; we need rank r=0 path
    for (let f = 1; f <= 6; f++) s2.board[0 * 8 + f] = null // clear between a1..h1
    const moves = legalMovesFor(s2, c(0,0)) // white rook at a1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(7,0))
  })

  it('rook cannot mirror if blocked on rank', () => {
    const s = initialPosition()
    const moves = legalMovesFor(s, c(0,0))
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror).toBeUndefined()
  })

  it('knight may mirror regardless of path', () => {
    const s = initialPosition()
    const moves = legalMovesFor(s, c(1,0)) // white knight at b1
    const mirror = moves.find(m => m.special === 'mirror')
    expect(mirror?.to).toEqual(c(6,0)) // b1 ↔ g1
  })
})

// --- tests/coord.test.ts ---
import { describe, it, expect } from 'vitest'
import { mirrorFile, algebraic } from '../src/game/coord'

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

// --- README.md ---
# Mirror Chess v0.1

Cross‑platform Ionic + React + TypeScript implementation of "Mirror Chess".

## Dev
```bash
pnpm i # or npm i / yarn
pnpm dev
```
Open http://localhost:5173

## Tests
```bash
pnpm test
```

## Rules (v0.1)
- Standard chess moves (no castling/en passant yet).
- **Mirror rule**: A piece may move to the exact mirror of its file (a↔h, b↔g, c↔f, d↔e) on the same rank if the horizontal path between `from` and `mirror(from)` is clear. **Knights** may mirror regardless of path (they jump). Destination must be empty or an opponent piece.

## Architecture
- FP‑first pure utilities in `src/game/*` with strong types and docs.
- UI is a thin layer (`BoardView`) that renders the board and delegates to move generator.
- Reducer applies only legal moves. Future: check/checkmate, PGN, timers, multiplayer.

// =============================
// END OF SCAFFOLD
// =============================
