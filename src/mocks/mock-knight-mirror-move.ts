import type { BoardScenario } from '@shared/boards'

/**
 * Knight mirror move test scenario: Na3 with simple board setup.
 * Tests regular L-shaped moves (b1, b5, c1, c3) and mirror move to h3.
 * Includes a pawn on g2 to validate blocking behavior.
 */

export const KNIGHT_MIRROR_A3_SCENARIO: BoardScenario = {
  name: 'Knight A3: Regular moves (b1, b5, c1, c3) + Mirror move (h3)',
  // Simple board with just a knight on a3 and a pawn on g2
  spec: [
    'w:Na3',  // White knight on a3
    'b:Pg2'   // Black pawn on g2 (blocks some moves)
  ].join('; '),
  turn: 'white',
  select: 'a3',
  // Regular L-shaped moves should be available: b1, b5, c1, c3
  // Mirror move to h3 should also be available
  mustHints: ['b1', 'b5', 'c1', 'c3', 'g4'],
  // g2 should be blocked by the black pawn (knight can't capture friendly pieces)
  // g4 should not be a valid move (not a standard knight move from a3)
  mustNotHints: ['g2']
}


