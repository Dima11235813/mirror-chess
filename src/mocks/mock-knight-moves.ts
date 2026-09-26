import type { BoardScenario } from '@shared/boards'

/**
 * Knight on a3, crossing the seam by **L measured across it**
 * (`prj-mgmt/epics/rules/mirror-portal-spec.md` §11).
 *
 * The knight keeps all eight L-moves: `b5, c4, c2, b1` on its own side and
 * `h5, g4, g2, h1` across the seam. Here an own pawn on `b5` removes that square and
 * an enemy pawn on `c4` stays capturable, leaving seven hints. `h3` is listed as
 * forbidden because it is what the *rejected* "file mirror, same rank" rule would
 * have produced.
 */
export const KNIGHT_A3_SCENARIO: BoardScenario = {
  name: 'Knight a3: L-moves on both sides of the seam (b1, c2, c4 + h5, g4, g2, h1)',
  spec: [
    'w:Na3,Pb5', // white knight on a3, own pawn occupying one L-destination
    'b:Pc4',     // black pawn on c4 is a capturable L-destination
  ].join('; '),
  turn: 'white',
  select: 'a3',
  mustHints: ['b1', 'c2', 'c4', 'h5', 'g4', 'g2', 'h1'],
  // b5 holds an own piece; h3 is the rejected same-rank file mirror.
  mustNotHints: ['b5', 'h3'],
}
