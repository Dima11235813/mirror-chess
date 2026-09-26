# Task — ESLint does not run in this repo at all

> **Status: OPEN.** Found 2026-08-04 while adding the engine's layer boundaries.
> Housekeeping, not urgent — but it silently invalidates a standing assumption.

## The problem

`.eslintrc.cjs` exists, is well configured, and is **never executed**. The installed ESLint
is v9, which looks for a flat `eslint.config.js`; the legacy `.eslintrc.cjs` is ignored
unless `ESLINT_USE_FLAT_CONFIG=false` is set. There is also no `lint` script in
`package.json`, so nothing invokes it in the first place.

Every rule in that file is therefore decoration: `strict` import ordering, the
no-testing-library-in-unit-tests restriction, `consistent-type-imports`, `prefer-const`,
Prettier integration. None of it has run for the life of the project.

## Why it matters more than it looks

It was nearly made worse. The engine story asked for an **ESLint import-boundary rule** to
enforce the layer graph, and writing one into `.eslintrc.cjs` would have produced
boundaries that *looked* enforced and were not — strictly worse than nothing, because they
would have been believed. That is why `scripts/check-layer-boundaries.js` exists instead
([ADR 0006](../engine/adr/0006-engine-layers-and-branded-quantities.md)).

The repo now has three bespoke checkers doing work a linter should do:

| Script | Doing the job of |
| --- | --- |
| `scripts/check-layer-boundaries.js` | `import/no-restricted-paths`, `no-restricted-globals` |
| `scripts/validate-test-naming.js` | `no-restricted-imports` per file pattern |
| `scripts/check-docs-links.js` | (no linter equivalent — keep this one) |

They run and they explain themselves when they fire, which is why they were worth writing.
But two of the three are re-implementing a linter badly: `check-layer-boundaries.js` matches
text with regexes and had to grow a comment-stripper after it flagged the doc comment that
*explains* the rule it was enforcing. It still cannot tell a `//` in a string from a real
one.

## What to do

1. Migrate `.eslintrc.cjs` → `eslint.config.js` (flat config). `@eslint/eslintrc`'s
   `FlatCompat` makes this mostly mechanical.
2. Add `"lint": "eslint ."` and wire it into the review checklist.
3. **Expect a large first run.** Nothing has ever been linted; treat the initial output as
   a backlog to triage, not a blocker, and consider landing it with warnings before errors.
4. Move the layer rules from `check-layer-boundaries.js` into
   `import/no-restricted-paths` + `no-restricted-globals`, then delete the script. Keep the
   *messages* — they explain why each boundary exists, which is most of their value.
5. Keep `check-docs-links.js` regardless; no linter checks markdown links.

## Acceptance criteria

- [ ] `npm run lint` runs and is documented in CLAUDE.md §8.
- [ ] The engine layer boundaries are enforced by ESLint, with the explanatory messages
      preserved, and `check-layer-boundaries.js` is deleted.
- [ ] The unit-test / integration-test import restriction actually fires — verify by
      temporarily importing `@testing-library/react` into a `.test.ts`.
- [ ] CLAUDE.md §8 no longer says "ESLint does not run in this repo".
