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
import { PUZZLE_SCHEMA, type PuzzleSet } from '../src/puzzles/types'

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1]! : fallback
}

const perSet = Number(arg('per-set', '400'))
const seed = Number(arg('seed', '20260925'))
const out = arg('out', 'puzzles/mate-in-2.v1.json')

if (!Number.isInteger(perSet) || perSet <= 0) throw new Error(`--per-set must be a positive integer, got ${perSet}`)
if (!Number.isInteger(seed)) throw new Error(`--seed must be an integer, got ${seed}`)

console.log(`mining: ${DEFAULT_MATERIAL.length} material sets x ${perSet} placements, seed ${seed}`)
const startedAt = Date.now()
const { puzzles, stats } = minePuzzles({ ruleset: TOKEN_ALL_ON, seed, perSet })
const elapsed = (Date.now() - startedAt) / 1000

const set: PuzzleSet = {
  schema: PUZZLE_SCHEMA,
  goal: 'mate-in-2',
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
  not a unique M2   ${stats.notUniqueMateInTwo} (${pct(stats.notUniqueMateInTwo)})
  faster mate       ${stats.fasterMateExists} (${pct(stats.fasterMateExists)})
  also mate in chess${stats.alsoMateInChess.toString().padStart(4)} (${pct(stats.alsoMateInChess)})
  kept              ${stats.kept} (${pct(stats.kept)})

puzzles written     ${puzzles.length} -> ${out}
  seam solutions    ${puzzles.filter(p => p.solution.crossedSeam).length}
  by material       ${DEFAULT_MATERIAL.map(m => `${materialLabel(m)}:${puzzles.filter(p => p.material === materialLabel(m)).length}`).join('  ')}
elapsed             ${elapsed.toFixed(1)}s (${((1000 * elapsed) / Math.max(1, stats.candidates)).toFixed(0)}ms/candidate)
`)
