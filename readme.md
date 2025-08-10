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

### Testing Strategy

We follow a **3-tier testing approach** with clear priorities and naming conventions:

#### 1. Unit Tests (`.test.ts` / `.test.tsx`) - **HIGHEST PRIORITY**
- **Purpose**: Test pure, isolated functions and logic
- **Scope**: No DOM dependencies or external state
- **Performance**: Fast execution, run during local development
- **Restrictions**: **NO testing-library imports allowed** - these are for pure logic only
- **Location**: Co-located with source files or in `src/game/*`

#### 2. Integration Tests (`.spec.ts` / `.spec.tsx`) - **LOWEST PRIORITY**
- **Purpose**: Test component interactions and DOM behavior
- **Scope**: Use testing-library for component rendering
- **Performance**: Higher compute overhead, primarily for CI/CD
- **Dependencies**: Can use `@testing-library/*` packages
- **Use Case**: Only when testing component interactions

#### 3. E2E Tests (`.e2e.ts`) - **MEDIUM PRIORITY**
- **Purpose**: Test complete user workflows from prj-mgmt stories
- **Scope**: Use Playwright for browser automation
- **Performance**: Run during CI/CD and before releases
- **Location**: In `prj-mgmt/` folders alongside user stories

### Test Commands

```bash
# Unit tests (fast, for local dev)
npm run test          # Run once
npm run test:watch    # Watch mode

# Int tests (slower, for CI/CD)
npm run test:int   # Run once
npm run test:int:watch

# E2E tests (slowest, for CI/CD and run locally before authoring PR)
npm run test:e2e

# All tests (CI/CD)
npm run test:all

# Coverage (unit tests only)
npm run test:coverage
```

### Development Workflow

- **Local Development**: Run `npm run test:unit:watch` for fast feedback
- **Before Committing**: Run `npm run test:unit` to ensure unit tests pass
- **CI/CD**: Runs `npm run test:all` to execute all test types
- **Pre-release**: Run `npm run test:e2e` to validate user workflows

### Test Naming Enforcement

The build will fail if these naming conventions are violated:
- Unit tests must use `.test.ts` extension
- Integration tests must use `.spec.ts` extension  
- E2E tests must use `.e2e.ts` extension
- Testing library can only be used in `.spec.ts` files

## Rules (v0.1)

- Standard chess moves (no castling/en passant yet). Captures are allowed per normal chess.
- Mirror portal (horizontal):
  - For any piece, compute the file-mirror on the same rank. If the rank path is clear (knights ignored), and the destination is empty or contains an opponent piece, the piece may move to that mirror square with `special: 'mirror'`.
  - For rooks and queens, if the mirror square is empty and the rank path is clear, they may continue sliding on the same rank on the opposite half (away from the center) until blocked, also as `special: 'mirror'` moves.
  - Portal movement is strictly horizontal: it never changes rank. Example: a queen on `d3` may portal to `h3` (and potentially `g3`, `f3`), but not to `h7` via the portal. Any non‑horizontal target like `h7` would only be legal if it is a standard queen move with an unobstructed path.
  - Knights portal differently: the horizontal component is portalized, then the knight completes the vertical ±2 step. Example: a knight on `h3` portals to file `a` and lands on `a5` or `a1` if inside the board and not blocked by own piece. The square `a3` is not a knight portal target.