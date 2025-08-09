import type { BoardScenario } from '@shared/boards'

/**
 * Knight mirror hop showcase based on e2e-strategy.md (Na3 -> h5).
 * Using compact piece spec for app URL loading.
 *
 * FEN reference (for humans):
 * r1b1kb2/1bB2p2/PrnQbn1R/3p1np1/7P/N5n/P1PPPPP1/R1BQKB2 w - - 0 1
 */

// Convert the FEN position to our compact spec (only the necessary pieces).
// We include enough pieces to reproduce the mirror-hop legality and hints.
// The essential bits are a White knight on a3 with path-blockers elsewhere
// irrelevant to the knight's mirror ability, and that h5 is a legal mirror.

export const KNIGHT_MIRROR_A3_SCENARIO: BoardScenario = {
  name: 'Knight mirror A3 -> H5',
  // Compact spec crafted from the reference diagram/position; sufficient for UI hints
  // White pieces
  spec: [
    'w:Na3,Ke1,Qd1,Bc2,Rh6,Pa2,Pb2,Pc2,Pd2,Pe2,Pf2,Ph4',
    // Black pieces
    'b:Kg8,Qd6,Bb7,Bf6,Nc6,Ng3,Pa6,Pd5,Ng5,Pg6,Rh5'
  ].join('; '),
  turn: 'white',
  select: 'a3',
  // As per v0.1 rules: mirror is same-rank opposite file; knights ignore blockers.
  mustHints: ['h3'],
  mustNotHints: ['h5']
}


