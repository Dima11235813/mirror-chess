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

- Standard chess moves (no castling/en passant yet).
- Mirror rule: a piece may move to the exact mirror of its file (a↔h, b↔g, c↔f, d↔e) on the same rank if the horizontal path between `from` and `mirror(from)` is clear. Knights may mirror regardless of path (they jump). Destination must be empty or an opponent piece.