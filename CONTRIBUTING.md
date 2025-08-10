# Contributing to Mirror Chess

Welcome to **Mirror Chess**! We’re building a cross‑platform chess variant in Ionic + React + TypeScript with an extra twist: **the mirror rule**.

This guide explains how to contribute code, tests, and ideas while keeping the project maintainable and fun to work on.

---

## 📜 Code of Conduct
We aim for a respectful, inclusive, and collaborative environment. Please be constructive and kind in discussions and reviews.

---

## 🏗 Project Overview
- **Stack:** Ionic + React + TypeScript + Vite + Vitest
- **Architecture:**
  - `src/game/*` → **Pure, functional, deterministic** chess logic (no DOM, no I/O).
  - `src/components/*` → UI components that render data and dispatch actions.
  - `src/App.tsx` → Composition and state container.
- **Special Rule:** The **mirror move** lets a piece jump to the file‑mirrored square if:
  - The path along the rank is clear (sliding pieces)
  - Knights can mirror regardless of blockers
  - Destination is empty or contains an opponent piece

---

## ✅ How to Contribute

### 1. Before You Start
- Familiarize yourself with the rules in `README.md`.
- Review the AI Contributor Style Guide in `.cursorrules` — humans follow it too!
- Check open issues for context before starting a new feature.

### 2. Development Setup
```bash
# Clone the repo
 git clone <repo-url>
 cd mirror-chess

# Install dependencies
 pnpm install   # or npm / yarn

# Start the dev server
 pnpm dev

# Run tests
 pnpm test
```
Visit `http://localhost:5173` in your browser to play the game locally.

### 3. Code Style & Best Practices
- **Functional programming first:** keep logic pure, no side effects in `src/game/*`.
- **TypeScript strict mode:** no `any` or `ts-ignore` unless absolutely necessary (document why).
- **Strong types:** use `readonly` where applicable; explicit return types.
- **DRY & SOLID:** single‑responsibility functions and modules.
- **Docs:** All exported functions/types must have JSDoc with `@param` and `@returns`.
- **Accessibility:** UI should be usable with screen readers and keyboard navigation.

#### Domain type placement
- Put complex reusable types in **shared domain files** for intuitive reuse.
  - Cross‑component/app types (e.g., persistence records like `SavedGameMeta`) live under `src/shared/<domain>/types.ts` and are imported via `@shared/*`.
  - Game‑domain types live in `src/game/types.ts` (or a co‑located types module within `src/game/*`).
  - Keep component‑local shapes next to the component if truly local; promote to `src/shared/<domain>/` once reused.
- Prefer named `interface`/`type` exports over inline object literals in function signatures.

#### UI component structure
- One component per file under `src/components/*`. If a component grows beyond trivial, use a folder-per-component and colocate tests and local-only types:
  - `src/components/Foo/`
    - `Foo.tsx`
    - `Foo.types.ts` (local-only; promote to `src/shared/<domain>/` if reused)
    - `Foo.test.tsx` (unit tests with typed mocks and `as const` where appropriate)
    - `Foo.mocks.ts`
- Props must be defined with a named `interface`. Avoid inline props object literals.
- Respect `exactOptionalPropertyTypes`: only pass optional props when they are present (avoid `undefined`).

### 4. Testing

#### Testing Strategy & Priorities
We follow a **3-tier testing approach** with clear priorities and naming conventions:

1. **Unit Tests** (`.test.ts` / `.test.tsx`) - **HIGHEST PRIORITY**
   - Test pure, isolated functions and logic
   - No DOM dependencies or external state
   - Fast execution, run during local development
   - **NO testing-library imports allowed** - these are for pure logic only

2. **Integration Tests** (`.spec.ts` / `.spec.tsx`) - **LOWEST PRIORITY**
   - Test component interactions and DOM behavior
   - Use testing-library for component rendering
   - Higher compute overhead, primarily for CI/CD
   - Can use `@testing-library/*` packages

3. **E2E Tests** (`.e2e.ts`) - **MEDIUM PRIORITY**
   - Test complete user workflows from prj-mgmt stories
   - Use Playwright for browser automation
   - Run during CI/CD and before releases

#### Test Commands
```bash
# Unit tests (fast, for local dev)
npm run test:unit          # Run once
npm run test:unit:watch    # Watch mode

# E2E tests (slowest, for CI/CD)
npm run test:e2e

# All tests (CI/CD)
npm run test:all

# Coverage (unit tests only)
npm run test:coverage
```

#### Test Requirements
- All new or changed functions require:
  - **Happy path** test(s)
  - **Edge cases**
  - **Negative tests** (invalid input, blocked moves)
- **Unit tests first**: Focus on pure logic in `src/game/*`
- **Integration tests sparingly**: Only when testing component interactions
- **E2E tests**: For critical user workflows
- Use **Vitest** for unit/integration, **Playwright** for E2E
- Keep tests focused: one behavior per test

### 5. Submitting Changes
1. **Branch** from `main`: `feat/mirror-castling`, `fix/rook-path-bug`, etc.
2. Make commits that are small, focused, and have descriptive messages:
   - `feat: add check detection to legalMovesFor`
   - `fix: block mirror move if own piece occupies target`
3. Push and open a **Pull Request** (PR):
   - Describe the change and **why** it’s needed.
   - Include screenshots or GIFs for UI changes.
   - List new/changed tests.

### 6. Review Process
- At least one other contributor should review your PR.
- Address all review comments.
- Ensure all tests pass before merging.

### 7. Roadmap for Contributions
Here’s what’s next for Mirror Chess:
1. Check detection
2. Full move legality filtering
3. Capture highlighting in UI
4. Checkmate/stalemate detection
5. Special moves (castling, pawn promotion, en passant)
6. Move log + undo
7. Capacitor mobile builds

Pick an item, discuss in an issue, and start a PR!

---

## 🤝 Tips for Working With This Codebase
- Keep the **mirror rule** logic isolated so it’s easy to maintain.
- Don’t mix UI state with game logic.
- If you’re unsure, add a test first to lock in current behavior.
- Use the existing tests as examples.

---

## 📚 Resources
- [Ionic React Docs](https://ionicframework.com/docs/react)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Docs](https://vitest.dev/)

---

---

## 🌿 Branching Strategy & Environments

### Branches
- **`main`**: Protected. Always releasable; tagged releases come from here. Deploys to **QA** (gated by approval in CI/CD).
- **`dev`**: Integration branch. Auto-deploys to **Dev** environment on every merge.
- **Feature branches**: `feat/<short-description>` for new features; `fix/<short-description>` for bug fixes; `chore/<short-description>` for tooling/docs.

### Flow
1. Branch from **`dev`**: `git checkout -b feat/mirror-castling dev`.
2. Commit small, focused changes.
3. Open PR **feature → dev**. Ensure tests pass.
4. After review and squash-merge into `dev`, CI deploys to **Dev** env.
5. Periodically open PR **dev → main** (release). After review, merging into `main` triggers CI to prepare a **QA** deploy (manual approval required).

> **Future DevOps (planned):** CI/CD will enforce approvals for promoting builds from **Dev → QA** (on `main`) and later **QA → Prod** with versioned tags. Release notes will be generated from conventional commits.

---

**Thanks for contributing!** 🚀
