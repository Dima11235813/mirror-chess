/**
 * MINE A PUZZLE SET — the thin shell around `src/puzzles/mine.ts`.
 *
 * Everything decidable lives in the module, which is pure and unit-tested; this file only
 * reads arguments, writes a file and prints a report. Run it with `vite-node`, which
 * already ships with vitest and resolves the repo's path aliases, so mining needs no new
 * dependency:
 *
 *     npm run mine:puzzles -- --per-set 400 --seed 20260925 --out puzzles/mate-in-2.v1.json
 *
 * Mining costs roughly 50 ms per candidate and keeps about 1–3% of them, so a few thousand
 * candidates is a minute or two and yields a few dozen puzzles. The seed is what makes a
 * published set reproducible: same seed, same puzzles, byte for byte.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { TOKEN_ALL_ON } from '../src/game/rules'
import { DEFAULT_MATERIAL, materialLabel, minePuzzles } from '../src/puzzles/mine'
import { PUZZLE_SCHEMA, type Puzzle, type PuzzleGoal, type PuzzleSet } from '../src/puzzles/types'

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback
}

const perSet = Number(arg('per-set', '400'))
/** Mate in 3 costs ~15x more per candidate (measured), so it gets its own, smaller budget. */
const perSet3 = Number(arg('per-set-3', String(Math.max(1, Math.round(perSet / 2)))))
const seed = Number(arg('seed', '20260925'))
const out = arg('out', 'puzzles/puzzles.v2.json')
const goals = arg('goals', 'both')

if (!Number.isInteger(perSet) || perSet <= 0) throw new Error(`--per-set must be a positive integer, got ${perSet}`)
if (!Number.isInteger(seed)) throw new Error(`--seed must be an integer, got ${seed}`)

const wanted: PuzzleGoal[] =
  goals === 'mate-in-2' ? ['mate-in-2'] : goals === 'mate-in-3' ? ['mate-in-3'] : ['mate-in-2', 'mate-in-3']

console.log(`mining ${wanted.join(' + ')}: ${DEFAULT_MATERIAL.length} material sets, seed ${seed}`)
const startedAt = Date.now()

const puzzles: Puzzle[] = []
const stats = { candidates: 0, illegalOrOver: 0, notUniqueMate: 0, fasterMateExists: 0, keptAlsoMateInChess: 0, kept: 0 }
const seen = new Set<string>()

for (const goal of wanted) {
  const budget = goal === 'mate-in-3' ? perSet3 : perSet
  console.log(`  ${goal}: ${budget} placements per set...`)
  const run = minePuzzles({ ruleset: TOKEN_ALL_ON, seed, perSet: budget, goal })
  for (const key of Object.keys(stats) as (keyof typeof stats)[]) stats[key] += run.stats[key]
  for (const puzzle of run.puzzles) {
    if (seen.has(puzzle.id)) continue
    seen.add(puzzle.id)
    puzzles.push(puzzle)
  }
}

const elapsed = (Date.now() - startedAt) / 1000

const set: PuzzleSet = {
  schema: PUZZLE_SCHEMA,
  goals: wanted,
  ruleset: TOKEN_ALL_ON,
  generatedBy: 'scripts/mine-puzzles.ts',
  seed,
  candidates: stats.candidates,
  puzzles,
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `${JSON.stringify(set, null, 2)}\n`, 'utf8')

const pct = (n: number) => `${((100 * n) / Math.max(1, stats.candidates)).toFixed(1)}%`
console.log(`
candidates          ${stats.candidates}
  already over      ${stats.illegalOrOver} (${pct(stats.illegalOrOver)})
  no unique mate    ${stats.notUniqueMate} (${pct(stats.notUniqueMate)})
  faster mate       ${stats.fasterMateExists} (${pct(stats.fasterMateExists)})
  kept              ${stats.kept} (${pct(stats.kept)})
    of which also a mate in chess: ${stats.keptAlsoMateInChess} — kept deliberately, as a label

puzzles written     ${puzzles.length} -> ${out}
  seam solutions    ${puzzles.filter(p => p.solution.crossedSeam).length}
  by goal           ${wanted.map(g => `${g}:${puzzles.filter(p => p.goal === g).length}`).join('  ')}
  by band           ${['easy', 'medium', 'hard'].map(b => `${b}:${puzzles.filter(p => p.difficulty === b).length}`).join('  ')}
  by differential   ${[...new Set(puzzles.map(p => p.chessDifferential))].map(d => `${d}:${puzzles.filter(p => p.chessDifferential === d).length}`).join('  ')}
  by material       ${DEFAULT_MATERIAL.map(m => `${materialLabel(m)}:${puzzles.filter(p => p.material === materialLabel(m)).length}`).join('  ')}
elapsed             ${elapsed.toFixed(1)}s (${((1000 * elapsed) / Math.max(1, stats.candidates)).toFixed(0)}ms/candidate)
`)
