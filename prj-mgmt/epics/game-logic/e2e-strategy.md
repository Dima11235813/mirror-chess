Absolutely—this is a perfect knight showcase.

**Diagram (triple-board, with mirror hop A3 → H5):**
[Download the image](sandbox:/mnt/data/mirror_knight_a3_to_h5.png)

---

# Board state (notation)

**FEN (from your screenshot):**
`r1b1kb2/1bB2p2/PrnQbn1R/3p1np1/7P/N5n/P1PPPPP1/R1BQKB2 w - - 0 1`

(White to move; this position allows the mirror-knight hop **Na3 → h5**.)

---

# Strongly-typed TypeScript model + loader

```ts
// chess/types.ts
export type File = 'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h';
export type Rank = 1|2|3|4|5|6|7|8;
export type Square = `${File}${Rank}`;

export type Color = 'white' | 'black';
export type PieceType = 'K'|'Q'|'R'|'B'|'N'|'P';

export interface Piece {
  readonly color: Color;
  readonly type: PieceType;
}

export type Board = Partial<Record<Square, Piece>>;

export interface Position {
  readonly board: Board;
  readonly sideToMove: Color;
  readonly castling: { K:boolean; Q:boolean; k:boolean; q:boolean };
  readonly enPassant: Square | null;
  readonly halfmoveClock: number;
  readonly fullmoveNumber: number;
  /** Standard FEN serialization (no mirror info here; pure chess) */
  fen(): string;
}

// --- FEN <-> Position (concise, safe) ---
const FILES: File[] = ['a','b','c','d','e','f','g','h'];
const RANKS: Rank[] = [8,7,6,5,4,3,2,1];

export function fromFEN(fen: string): Position {
  const [piecePart, stm, castling, ep, half, full] = fen.trim().split(/\s+/);
  const rows = piecePart.split('/');
  if (rows.length !== 8) throw new Error('Bad FEN: rows != 8');

  const board: Board = {};
  rows.forEach((row, rIdx) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += Number(ch); continue; }
      const file = FILES[f];
      const rank = RANKS[rIdx];
      const square = `${file}${rank}` as Square;
      const color: Color = ch === ch.toUpperCase() ? 'white' : 'black';
      const type = ch.toUpperCase() as PieceType;
      board[square] = { color, type };
      f++;
    }
  });

  const pos: Position = {
    board,
    sideToMove: (stm === 'w' ? 'white' : 'black'),
    castling: {
      K: castling.includes('K'),
      Q: castling.includes('Q'),
      k: castling.includes('k'),
      q: castling.includes('q')
    },
    enPassant: ep === '-' ? null : (ep as Square),
    halfmoveClock: Number(half ?? 0),
    fullmoveNumber: Number(full ?? 1),
    fen() { return fen; }
  };
  return pos;
}

// Example: load your screenshot position
export const MIRROR_KNIGHT_A3_POS = fromFEN(
  'r1b1kb2/1bB2p2/PrnQbn1R/3p1np1/7P/N5n/P1PPPPP1/R1BQKB2 w - - 0 1'
);

// Custom mirror move notation suggestion (optional):
// Standard SAN cannot express "mirror"; recommend tagging it, e.g.:
export const MIRROR_MOVE_SAN = 'N h5 (mirror)'; // from a3 to h5
```
