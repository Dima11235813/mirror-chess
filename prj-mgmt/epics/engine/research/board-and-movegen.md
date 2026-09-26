# Research — board representation & move generation

> Fan-out stream 1 of 5, 2026-08-02. See [`README.md`](./README.md) for the CPW-503
> sourcing caveat: the CPW citations below were **not read**, only cited from search
> results. The numeric perft claims come from primary sources that were opened.

## Board representation — and why two popular choices are actively wrong for us

| Option | Tolerates a configurable seam? |
| --- | --- |
| **Flat 64 mailbox** | **Excellent** — geometry lives in tables, not index arithmetic |
| 10×12 mailbox (Sunfish, VICE) | **Actively hostile** — the padding exists precisely to prevent file wrap-around |
| 0x88 (chess.js) | **Breaks** — `from - to` delta tables assume a ray is a straight line in linear index space; `a4↔h4` is already a legal delta, so same-line tests misclassify |
| Bitboards + magics | Salvageable with care — see below |

The finding worth internalising: **10×12 and 0x88 are not merely unsuitable, they are
optimisations *for* the thing we are deleting.** Their whole value proposition is that
the edge of the board is a wall.

**Recommendation for v1: flat 64 mailbox plus a `Geometry` compiled per ruleset.** Move
`Coord {f,r}` out to the UI boundary and use `Square = 0..63` internally — it removes
per-step object allocation and makes tables directly indexable.

```ts
export type Square = number & { readonly __brand: 'Square' } // 0..63

export interface Geometry {
  readonly slideRays: readonly (readonly (readonly Square[])[])[] // [from][dir] → ordered path
  readonly knightTargets: readonly (readonly Square[])[]
  readonly kingTargets: readonly (readonly Square[])[]
  readonly pawnCaptures: readonly (readonly (readonly Square[])[])[] // [color][from]
}

export function compileGeometry(rules: RuleSet): Geometry
```

This confirms [ADR 0003](../adr/0003-rule-configuration-in-the-hot-path.md): every
slider under every flag combination collapses to one loop shape.

### Two concrete traps when compiling ray paths

1. **A horizontal rook ray is a cycle.** From `a4` rightward you reach `h4` and hop back
   to `a4`. Truncate every path at 7 squares, or stop before re-entering the origin, or
   a rook attacks itself and the walk loops. Rays with `dr ≠ 0` always terminate on rank
   overflow, so only the horizontal case needs the cap.
2. **Memoise `Geometry` by flag bitmask.** There are only 64 rulesets, so a
   `Map<number, Geometry>` *is* the entire "compile once per search" story.

### Correction to ADR 0003 on magic bitboards

ADR 0003 asserts magics do not apply because our diagonal-with-a-free-hop is not a
masked straight line. That is too strong. Magics require a fixed **ordered path** per
(square, direction) with first-blocker semantics — which we have. Build the mask from
the extended path's interior and fill the table by walking it.

What we genuinely lose: the **edge-trim optimisation** (edge squares stop being
irrelevant, so masks and tables grow) and the **rook rank⊕file decomposition**. Note
also that the classic *shift-based* bitboard fill tricks do break — see
[`search.md`](./search.md), which reached that conclusion independently. Start with
classic ray-mask + bitscan, not magics, and only go magic if profiling demands it.

## Move generation

Pseudo-legal generation plus a legality filter is standard (Stockfish generates
pseudo-legal and filters via `pos.legal(m)`). Fully-legal generators are faster and much
harder to get right. **Keep pseudo-legal for v1.**

### Replace copy-board-and-scan with the superpiece trick

The standard cheap answer to "is square S attacked by colour C" is **reverse attack
generation**: from S, generate each piece kind's attacks *as if a friendly piece of that
kind stood there*, and check whether an enemy of that kind sits on a target. Roughly 40
steps instead of scanning every enemy piece's full rays, and no board copy.

```ts
export function isAttacked(pos: Position, geo: Geometry, sq: Square, by: Color): boolean
export function attackersTo(pos: Position, geo: Geometry, sq: Square): readonly Square[]
```

**This is only sound if the attack relation is symmetric** — A attacks B ⟺ a same-kind
piece on B attacks A. Our rank-preserving hop and modulo-8 stepper wrap both *look*
symmetric, but the entire scheme collapses if they are not. **This earns a property test
over all 64×64 square pairs × 6 kinds × 64 rulesets**, and it is the highest-value test
in the whole movegen layer.

Two further variant-specific cautions:

- **Never compute blocking squares by interpolating coordinates.** Under the seam,
  "between the king and the checker" is not a linear interpolation — it must come from
  the compiled ray path. (Stream 3 reached the same conclusion about
  `squaresBetween()`.)
- When testing king moves, **remove the king from occupancy first**, or it shadows the
  checking ray.

Design the signature so staged generation can be added later without a rewrite:
`generate(pos, geo, gen: GenType)` with `Captures | Quiets | Evasions`.

## Make/unmake vs copy

Do **both**, split by audience: keep `applyMove(state, move): GameState` pure for the UI
and reducer; add a mutable search board with `makeMove` / `unmakeMove` behind the same
`Geometry`. That *is* the translation layer of
[ADR 0002](../adr/0002-two-implementations-one-oracle.md), and differential perft
validates it.

State to restore (Stockfish's `StateInfo`): captured piece, castling rights, en-passant
square, halfmove clock, Zobrist key, plus cached `checkers`/`pinned`. **Reserve these
fields now even if unused.**

## Move encoding

Engines pack a move into 16 bits: `from(6) | to(6) | flags(4)`. For readable TS, keep an
object but make it flat and closed, and **derive rather than store**:

```ts
export type MoveFlag = 'quiet' | 'capture' | 'doublePush' | 'enPassant'
                     | 'castleKing' | 'castleQueen' | 'promotion' | 'promotionCapture'
```

Two specific recommendations against our current `Move` shape:

- **Drop `captures?: Coord`.** The only case where the victim is not on `to` is en
  passant, and that square is derivable from `flag + to`. Storing it creates two sources
  of truth that can diverge.
- **Drop `special: 'mirror'` as a rule input.** If the UI wants to mark a seam crossing,
  expose `crossedSeam(move, geo): boolean` as a derived predicate.

*(Both are worth doing but touch the existing UI, which reads `special: 'mirror'` for
hint styling. Sequence deliberately.)*

## Perft fixtures

Adopt **Ethereal's `standard.epd`** (126 positions with `;D1 … ;D6` counts) verbatim,
run with all flags off. Verified first-hand from that file:

| Position | Counts |
| --- | --- |
| Start | 20 / 400 / 8,902 / 197,281 / 4,865,609 / 119,060,324 |
| **Kiwipete** `r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -` | 48 / 2,039 / 97,862 / 4,085,603 / 193,690,690 |
| Pos 3 `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - -` | 14 / 191 / 2,812 / 43,238 / 674,624 |
| Pos 4 `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq -` | 6 / 264 / 9,467 / 422,333 / 15,833,292 |
| Pos 5 `rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8` | 44 / 1,486 / 62,379 / 2,103,487 / 89,941,194 |

Pos 6 (commonly cited as 46 / 2,079 / 89,890 / 3,894,594) **could not be verified** —
re-check when CPW is reachable.

Note these require castling, promotion and en passant, which we do not yet have — so
they become available as we implement those rules, not before.

### Perft bug classes to write targeted tests for

Standard: en passant exposing a rank pin (both pawns leave the rank); castling rights
not cleared when a rook is captured; castling through an attacked square; promotion
counted once instead of four; king sliding *along* a checking ray because it was not
removed from occupancy; double check not restricted to king moves; applying
50-move/repetition at perft leaves (perft counts leaves — it must not).

**Mirror-specific:** horizontal ray cycling back to the origin; stepper wrap when the
*rank* overflows (must yield nothing); bishop colour-parity flip; attack symmetry across
the seam.

## Explicitly not in v1

No bitboards or magics; no Zobrist-driven TT; no staged/lazy generation; no piece lists;
no pin-based legality (copy/make + `isAttacked` until perft is green); no 10×12 or 0x88;
**no flag reads below `compileGeometry`** — if `RuleSet` appears inside movegen, that is
a bug; no `{f,r}` objects in the perft loop; no inventing en-passant or castling
behaviour at the seam (spec first, CLAUDE.md §11); no Rust/WASM before the differential
perft harness exists.

## Prior art worth knowing

**Cylinder chess** is the nearest published variant — but its bishop *keeps* the
diagonal across the wrap and therefore stays colour-bound, unlike our rank-preserving
hop. Useful for movegen ideas, misleading for evaluation.

## Sources

- Ethereal perft suite (opened): https://raw.githubusercontent.com/AndyGrant/Ethereal/master/src/perft/standard.epd
- Magic bitboards explained: https://analog-hors.github.io/site/magic-bitboards/
- Stockfish (pseudo-legal + `pos.legal()`, 16-bit move, `StateInfo`): https://github.com/official-stockfish/Stockfish
- Sunfish (padded mailbox — the anti-pattern here): https://github.com/thomasahle/sunfish
- chess.js (0x88 in TS): https://github.com/jhlywa/chess.js
- Rustic book: https://rustic-chess.org/
- Cylinder chess: https://en.wikipedia.org/wiki/Cylinder_chess
- CPW (503, unread): Board_Representation, Mailbox, 10x12_Board, 0x88, Bitboards, Magic_Bitboards, Move_Generation, Legal_Move, Pin, Encoding_Moves, Perft_Results
