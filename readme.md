# Mirror Chess

What’s implemented now:

* Clean board UI with selectable pieces + legal-move hints.
* Core game engine (pure functions) in `src/game/*`.
* Mirror rule (v0.1): a piece may also move to the **file-mirrored square** (a↔h, b↔g, c↔f, d↔e) on the **same rank** if the horizontal path is clear; **knights** may mirror regardless of blockers. Tests included.

## Dev

```bash
npm i
npm run dev
```
Open `http://localhost:5173`.

## Tests

```bash
npm test
```

## Rules (v0.1)

- Standard chess moves (no castling/en passant yet). Captures are allowed per normal chess.
- Mirror portal (horizontal):
  - For any piece, compute the file-mirror on the same rank. If the rank path is clear (knights ignored), and the destination is empty or contains an opponent piece, the piece may move to that mirror square with `special: 'mirror'`.
  - For rooks and queens, if the mirror square is empty and the rank path is clear, they may continue sliding on the same rank on the opposite half (away from the center) until blocked, also as `special: 'mirror'` moves.
  - Portal movement is strictly horizontal: it never changes rank. Example: a queen on `d3` may portal to `h3` (and potentially `g3`, `f3`), but not to `h7` via the portal. Any non‑horizontal target like `h7` would only be legal if it is a standard queen move with an unobstructed path.
  - Knights portal differently: the horizontal component is portalized, then the knight completes the vertical ±2 step. Example: a knight on `h3` portals to file `a` and lands on `a5` or `a1` if inside the board and not blocked by own piece. The square `a3` is not a knight portal target.