# Story — Reconcile the TS core with the Mirror Portal spec

> Implements §9 of [`mirror-portal-spec.md`](./mirror-portal-spec.md). That spec is
> the oracle: every acceptance criterion below is traceable to a numbered section
> of it. If this story and the spec disagree, **the spec wins**.

## Summary

As the owner of Mirror Chess, I want `legalMovesFor` to generate exactly the moves
defined by the Mirror Portal spec v1 — and nothing else — so that the engine has a
single, testable notion of "mirror" and the contradictory interpretations that broke
the first build are gone for good.

## Scope

**In:** `src/game/moves.ts` move generation, its unit tests, and the `prj-mgmt`
stories / e2e specs that assert the superseded behavior.

**Out:** check / checkmate / pins, castling, promotion, en passant, knight / king /
pawn portal moves, notation, UI changes (spec §8 — all deferred).

## Acceptance Criteria

### Portal generation — sliders only (spec §2, §4)
- [x] Bishop, Rook and Queen emit portal moves; **every** portal destination carries
      `special: 'mirror'`.
- [x] Knight, King and Pawn emit **standard chess moves only** — no move they emit
      ever carries `special: 'mirror'`.
- [x] A ray portals only if it reaches its **edge square** (`a`-file for `df < 0`,
      `h`-file for `df > 0`) with a clear path **and** that edge square is empty.
      A piece standing on the edge file is its own edge square for that direction.
- [x] The hop `edge → mirror(edge)` is **horizontal, same rank** (`a4 → h4`, never
      `h5`) — spec §4 "trap to avoid".
- [x] After the hop the ray **continues in the same direction `(df, dr)`** with
      standard sliding: empty → destination and keep going; enemy → capture and stop;
      own piece → stop before it; the origin square → stop.
- [x] Vertical rays (`df = 0`) never portal.
- [x] At most one seam crossing per ray (spec §4.3).

### Occupancy & capture (spec §6)
- [x] An enemy on the edge square is an ordinary capture that **stops** the ray — no
      portal past it.
- [x] An own piece anywhere on the path to the edge square blocks the portal.
- [x] A mirror move onto an own piece is never emitted.

### Classification (spec §4)
- [x] A square reachable both normally and via the portal is emitted **once**, as the
      standard move (no duplicate `mirror` hint).
- [x] A square reachable via two different portal rays is emitted once.

### Worked examples — the oracle (spec §5)
- [x] `w:Bb3` → mirror set is exactly `h4, g5, f6, e7, d8, h2, g1` (§5.1; the headline
      check is that the two portal mouths are `h4` and `h2`).
- [x] `w:Bc1` → mirror set is exactly `h3, g4, f5, e6, d7, c8, a6, b7` (§5.2, `c8`
      once).
- [x] `w:Ra4; b:Pc4` → mirror set is exactly `h4, g4, f4, e4, d4`; `c4` is a
      **standard** capture (§5.3).
- [x] Queen portal set = rook portal set ∪ bishop portal set from the same square
      (§5.4).

### Invariants (spec §7)
- [x] **Symmetry:** mirroring a position across the center file mirrors the generated
      move set.
- [x] **Superset:** every standard chess destination for B/R/Q is still generated.
- [x] **No rank change on the hop:** every mirror destination is reachable from
      `mirror(edge)` by repeating `(df, dr)`.
- [x] **Finite:** no ray yields more than 15 squares.

### Repo hygiene (spec §9)
- [x] `horizontalPortalWrap`, `diagonalPortalWrap`, the same-rank K/R/Q mirror, the
      knight adjacent-rank mirror capture and the pawn projection are **deleted**.
- [x] Unit tests asserting the superseded behavior are removed or rewritten; no test
      in the repo asserts a rule absent from the spec.
- [x] `prj-mgmt` stories that predate the spec are marked **superseded**, with a
      pointer to the spec, rather than silently left to contradict it.
- [x] `npm run test` and `npm run build` are clean, and `npm run test:int` is no worse
      than before this change (see Verification — its failures are pre-existing and
      confined to Ionic / SavedGames components).

## Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/mirror-portal.test.ts` | §5 oracle, §6 occupancy, §7 invariants, "no mirror for N/K/P" |
| Unit | `src/game/bishop.test.ts` | bishop standard + portal (corrected to §5.2) |
| Unit | `src/game/knight.test.ts` | knight is standard chess, emits no mirror |
| Unit | `src/game/moves.test.ts` | queen horizontal portal with blockers |
| E2E | `prj-mgmt/epics/game-logic/bishop/bishop-move.e2e.ts` | hints match §5.2 in the real UI |

Also added: `prj-mgmt/epics/rules/mirror-portal.e2e.ts` (the §5 headline in the UI).
`src/mocks/mock-knight-mirror-move.ts` became `src/mocks/mock-knight-moves.ts`, with
a scenario that no longer expects squares a knight cannot reach.

**Removed** (assert superseded rules): `src/game/mirror.test.ts`,
`src/game/mirror_portal.test.ts`, `src/game/pawn.mirror.test.ts`,
`src/game/pawn.enpassant.mirror.test.ts`,
`prj-mgmt/epics/game-logic/pawn/pawn-highlight-mirror.e2e.ts`,
`prj-mgmt/epics/game-logic/pawn/pawn-mirror-en-passant.e2e.ts`.

## Verification

| Command | Result |
| --- | --- |
| `npm run test` | **111 passed**, 2 skipped (orthodox EP, blocked on EP state) |
| `npm run build` | **clean** |
| `npx playwright test --workers=1` | **13 passed**, 2 skipped |
| `npm run test:int` | 13 failed / 40 passed — **identical with this change stashed**, so pre-existing |

The integration failures are in `SavedGamesList.spec.ts`, `IonicButton.spec.tsx` and
`IonicInput.spec.tsx`; none touches `src/game/*`. `SavedGamesList.spec.ts` also fails
`scripts/validate-test-naming.js`. Both are logged as component debt in `roadmap.md`.

### Fixed along the way (outside this story's scope, but blocking its QA)

1. **`npm run build` was already failing** on `IonicInput.test.tsx` — arrays typed as
   `IonicInputProps['x'][]` include `undefined`, which `exactOptionalPropertyTypes`
   rejects. Changed to `NonNullable<IonicInputProps['x']>[]`, which strengthens the
   types rather than relaxing them. Without this, `npm run preview` fails and the
   whole e2e tier cannot run.
2. **A stray `test.only`** in `pawn-regular-move.e2e.ts` had silently cut the
   Playwright run from 17 tests to 2, hiding a broken knight scenario and a failing
   bishop case. Removed; follow-up in
   [`task-e2e-parallelism.md`](./task-e2e-parallelism.md).

## Definition of done

The engine's only notion of "mirror" is the one in `mirror-portal-spec.md`, the §5
worked examples pass as executable tests, and nothing in `src/` or `prj-mgmt/`
describes a mirror rule the spec does not define.
