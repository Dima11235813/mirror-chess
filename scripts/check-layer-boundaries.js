#!/usr/bin/env node

/**
 * Engine layer-boundary checker — `prj-mgmt/epics/engine/architecture.md` §1.
 *
 * ## What this is
 *
 * A static check that the engine's dependencies point one way only:
 *
 * ```
 *   game/  (the rules)  →  engine/types  →  engine/eval  →  engine/search  →  engine/host
 * ```
 *
 * ## Why it is a script and not an ESLint rule
 *
 * The story asks for an ESLint import-boundary rule, and that is the right eventual home.
 * It is not the home today: this repo carries a legacy `.eslintrc.cjs` while its installed
 * ESLint expects a flat `eslint.config.js`, so *no* lint rule currently runs, and adding
 * one would have produced a rule that looks enforced and is not. A check that runs beats a
 * rule that reads well. Move these rules into ESLint when the flat-config migration
 * happens; the rules below are the specification for that move.
 *
 * ## The rules, and why each earns its place
 *
 * 1. **The game core must not import the engine.** `src/game/*` is the reference
 *    implementation *and* the correctness oracle
 *    (ADR 0002, two implementations one oracle). A dependency on the engine destroys the
 *    independence that makes it evidence rather than an echo.
 * 2. **Evaluation must not import search.** Evaluation may read the ruleset — a bishop
 *    genuinely is worth something different when it can cross the seam — but a "static"
 *    evaluation that searches is not static, and its cost stops being predictable.
 * 3. **Only the host layer may touch a clock, a thread or randomness.** Everything below
 *    it is pure and deterministic, which is precisely what makes a self-play study
 *    reproducible and a failing search reducible to a single position and depth.
 *
 * Run with `npm run check:layers`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

/** A forbidden pattern, with the reason a reader needs when it fires. */
const RULES = [
  {
    name: 'the game core must not import the engine',
    appliesTo: file => file.startsWith('src/game/'),
    forbid: /^\s*import[^\n]*from\s+['"](@engine\/|.*\/engine\/|\.\.\/engine\/)/gm,
    why:
      'src/game/* is the reference implementation the engine is checked against ' +
      '(ADR 0002). Depending on the engine destroys its independence as an oracle.',
  },
  {
    name: 'evaluation must not import search',
    appliesTo: file => /^src\/engine\/eval(\.ts|\/)/.test(file),
    forbid: /^\s*import[^\n]*from\s+['"][^'"]*search/gm,
    why:
      'A static evaluation that searches is not static, and its cost stops being ' +
      'predictable (architecture.md §1).',
  },
  {
    name: 'only the host layer may read a clock or a random number',
    appliesTo: file =>
      file.startsWith('src/engine/') &&
      !file.startsWith('src/engine/host/') &&
      !file.endsWith('.test.ts') &&
      !file.endsWith('bench.ts'),
    forbid: /\b(Date\.now|performance\.now|Math\.random|setTimeout|setInterval|new Worker)\b/g,
    why:
      'Search must be deterministic: the same position, ruleset and depth must always ' +
      'give the same move, or a self-play result cannot be reproduced and a bug cannot ' +
      'be reduced to a test case. Timing and threading belong to src/engine/host/.',
  },
]

/**
 * Blank out comments, preserving every character position.
 *
 * Without this the checker reports the *documentation* that explains a rule as a breach of
 * it — the note in `search.ts` warning that determinism "is lost by accident, one
 * `Date.now()` at a time" tripped the clock rule on its first run. Replacing comment bodies
 * with spaces rather than deleting them keeps line and column numbers honest, so a genuine
 * violation still points at the right place.
 *
 * This is a lexer's job and this is not a lexer: a `//` inside a string literal will still
 * blank the rest of the line. That is acceptable for import and global checks, and is
 * another reason these rules belong in ESLint once it runs here (ADR 0006).
 */
function withoutComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, match => ' '.repeat(match.length))
}

/** Every .ts/.tsx file under a directory, repo-relative, with forward slashes. */
function sourceFiles(dir) {
  const out = []
  const absolute = path.join(root, dir)
  if (!fs.existsSync(absolute)) return out

  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name)) out.push(path.relative(root, full).split(path.sep).join('/'))
    }
  }
  walk(absolute)
  return out
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length
}

const violations = []
for (const file of [...sourceFiles('src/game'), ...sourceFiles('src/engine')]) {
  const content = withoutComments(fs.readFileSync(path.join(root, file), 'utf8'))
  for (const rule of RULES) {
    if (!rule.appliesTo(file)) continue
    for (const match of content.matchAll(rule.forbid)) {
      violations.push({ file, line: lineOf(content, match.index), text: match[0].trim(), rule })
    }
  }
}

if (violations.length === 0) {
  console.log(`${GREEN}✓ engine layer boundaries hold${RESET}`)
  process.exit(0)
}

console.error(`\n${RED}❌ Engine layer boundary violations${RESET}\n`)
for (const violation of violations) {
  console.error(`${RED}${violation.file}:${violation.line}${RESET}  ${violation.rule.name}`)
  console.error(`  ${DIM}${violation.text}${RESET}`)
  console.error(`  ${violation.rule.why}\n`)
}
console.error(`See prj-mgmt/epics/engine/architecture.md §1.\n`)
process.exit(1)
