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

### 4. Testing
- All new or changed functions require:
  - **Happy path** test(s)
  - **Edge cases**
  - **Negative tests** (invalid input, blocked moves)
- Use **Vitest**. Run `pnpm test:watch` during development.
- Keep tests focused: one behavior per test.

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

**Thanks for contributing!** 🚀
