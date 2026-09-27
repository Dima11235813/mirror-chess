#!/usr/bin/env node

/**
 * Documentation link checker — `prj-mgmt/epics/engine/architecture.md` §5.
 *
 * ## What this is
 *
 * Every relative link in the docs must point at a file that exists.
 *
 * ## Why it exists
 *
 * The guided tour's whole value is that it points at *real code*. A tour that has drifted
 * from the code is worse than no tour: it teaches something false, confidently, and a
 * reader has no way to tell. Link-checking is the cheapest possible guard against the
 * commonest failure mode — a file gets renamed and the guide silently stops working.
 *
 * It cannot catch a section that describes code accurately-shaped but wrong. Nothing
 * cheap can. What it does catch is the drift that happens by accident rather than by
 * misunderstanding, which is most of it.
 *
 * Run with `npm run check:docs`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

/** Directories whose markdown is checked. */
const ROOTS = ['docs', 'prj-mgmt']

/** Extra files worth checking even though they are not in a docs root. */
const EXTRA_FILES = ['readme.md', 'roadmap.md', 'CLAUDE.md']

/** Markdown link targets: `[text](target)`. */
const LINK = /\[[^\]]*\]\(([^)]+)\)/g

function markdownFiles(dir) {
  const out = []
  const absolute = path.join(root, dir)
  if (!fs.existsSync(absolute)) return out

  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md')) out.push(path.relative(root, full).split(path.sep).join('/'))
    }
  }
  walk(absolute)
  return out
}

/** Is this a link we can check on disk? */
function isLocal(target) {
  if (/^[a-z]+:/i.test(target)) return false // http:, mailto:, …
  if (target.startsWith('#')) return false // same-page anchor
  return true
}

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length
}

const files = [...ROOTS.flatMap(markdownFiles), ...EXTRA_FILES.filter(f => fs.existsSync(path.join(root, f)))]
const broken = []

for (const file of files) {
  const content = fs.readFileSync(path.join(root, file), 'utf8')
  for (const match of content.matchAll(LINK)) {
    const raw = match[1].trim()
    if (!isLocal(raw)) continue

    // Strip any anchor; we check that the file exists, not that the heading does.
    const target = raw.split('#')[0]
    if (target === '') continue

    const resolved = path.resolve(path.dirname(path.join(root, file)), decodeURI(target))
    if (!fs.existsSync(resolved)) {
      broken.push({ file, line: lineOf(content, match.index), target: raw })
    }
  }
}

if (broken.length === 0) {
  console.log(`${GREEN}✓ ${files.length} markdown files, every local link resolves${RESET}`)
  process.exit(0)
}

console.error(`\n${RED}❌ Broken documentation links${RESET}\n`)
for (const item of broken) {
  console.error(`${RED}${item.file}:${item.line}${RESET}`)
  console.error(`  ${DIM}→ ${item.target}${RESET}\n`)
}
console.error('A guide that has drifted from the code is worse than no guide.\n')
process.exit(1)
