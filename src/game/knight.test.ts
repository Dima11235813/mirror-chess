import { describe, it, expect } from 'vitest';
import { legalMovesFor } from './moves';
import { initialPosition, fromPiecesSpec } from './setup';
import type { GameState, Coord } from './types';
import { WHITE, BLACK } from './types';

describe.skip('knight moves', () => {
  describe('debug', () => {
    it('simple knight test', () => {
      // Create a simple board with just a knight
      const state = fromPiecesSpec('w:Na3', 'white');

      // Check if the knight is actually placed
      const knightSquare = { f: 0, r: 2 }; // a3
      const piece = state.board[2 * 8 + 0];
      expect(piece).toBeDefined();
      expect(piece?.kind).toBe('N');
      expect(piece?.color).toBe(WHITE);

      // Check if we can get moves
      const moves = legalMovesFor(state, knightSquare);
      console.log('Moves for knight on a3:', moves);
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('regular moves', () => {
    it('knight on e4 has 9 legal moves (8 regular + 1 mirror)', () => {
      const state = initialPosition();
      // Place knight on e4
      const board = [...state.board];
      board[3 * 8 + 4] = { kind: 'N', color: WHITE }; // e4 = (4, 3)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 4, r: 3 });

      console.log('DEBUG: All moves for knight on e4:', JSON.stringify(moves, null, 2));
      expect(moves).toHaveLength(9); // 8 regular + 1 mirror
      const destinations = moves.map((m) => m.to);
      expect(destinations).toContainEqual({ f: 2, r: 1 }); // c2
      expect(destinations).toContainEqual({ f: 2, r: 5 }); // c6
      expect(destinations).toContainEqual({ f: 3, r: 1 }); // d2
      expect(destinations).toContainEqual({ f: 3, r: 5 }); // d6
      expect(destinations).toContainEqual({ f: 5, r: 1 }); // f2
      expect(destinations).toContainEqual({ f: 5, r: 5 }); // f6
      expect(destinations).toContainEqual({ f: 6, r: 2 }); // g3
      expect(destinations).toContainEqual({ f: 6, r: 4 }); // g5

      // Should also have mirror move
      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1);
    });

    it('knight on edge square has fewer moves', () => {
      const state = initialPosition();
      // Place knight on a1
      const board = [...state.board];
      board[0 * 8 + 0] = { kind: 'N', color: WHITE }; // a1 = (0, 0)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 0 });

      console.log('DEBUG: All moves for knight on a1:', JSON.stringify(moves, null, 2));
      expect(moves).toHaveLength(3); // 2 regular + 1 mirror
      const destinations = moves.map((m) => m.to);
      expect(destinations).toContainEqual({ f: 1, r: 2 }); // b3
      expect(destinations).toContainEqual({ f: 2, r: 1 }); // c2

      // Should also have mirror move
      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1);
    });

    it('knight can jump over pieces', () => {
      const state = initialPosition();
      // Place knight on e4 with pieces blocking its path
      const board = [...state.board];
      board[3 * 8 + 4] = { kind: 'N', color: WHITE }; // e4 = (4, 3)
      board[4 * 8 + 4] = { kind: 'P', color: BLACK }; // e5 = (4, 4) - blocks path to f6
      board[5 * 8 + 4] = { kind: 'P', color: BLACK }; // f5 = (5, 4) - blocks path to g6
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 4, r: 3 });

      // Should still be able to reach f6 and g5 despite blockers
      const destinations = moves.map((m) => m.to);
      expect(destinations).toContainEqual({ f: 5, r: 5 }); // f6
      expect(destinations).toContainEqual({ f: 6, r: 4 }); // g5
    });
  });

  describe('regular captures', () => {
    it('knight can capture enemy pieces', () => {
      const state = initialPosition();
      // Place knight on e4 with enemy pieces to capture
      const board = [...state.board];
      board[3 * 8 + 4] = { kind: 'N', color: WHITE }; // e4 = (4, 3)
      board[5 * 8 + 4] = { kind: 'P', color: BLACK }; // e6 = (4, 5) - enemy pawn
      board[5 * 8 + 5] = { kind: 'R', color: BLACK }; // f6 = (5, 5) - enemy rook
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 4, r: 3 });

      const captures = moves.filter(
        (m) => (m.to.f === 4 && m.to.r === 5) || (m.to.f === 5 && m.to.r === 5),
      );
      expect(captures).toHaveLength(2);
      expect(captures.every((m) => !m.special)).toBe(true); // Regular captures, not mirror
    });

    it('knight cannot capture friendly pieces', () => {
      const state = initialPosition();
      // Place knight on e4 with friendly pieces blocking
      const board = [...state.board];
      board[3 * 8 + 4] = { kind: 'N', color: WHITE }; // e4 = (4, 3)
      board[4 * 8 + 5] = { kind: 'P', color: WHITE }; // e6 = (4, 5) - friendly pawn
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 4, r: 3 });

      const blockedMoves = moves.filter((m) => m.to.f === 4 && m.to.r === 5);
      expect(blockedMoves).toHaveLength(0);
    });
  });

  describe('mirror moves', () => {
    it('knight on a3 can mirror to h3', () => {
      const state = initialPosition();
      // Place knight on a3
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1);
      expect(mirrorMoves[0]?.to).toEqual({ f: 7, r: 2 }); // h3
    });

    it('knight on h6 can mirror to a6', () => {
      const state = initialPosition();
      // Place knight on h6
      const board = [...state.board];
      board[5 * 8 + 7] = { kind: 'N', color: WHITE }; // h6 = (7, 5)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 7, r: 5 });

      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1);
      expect(mirrorMoves[0]?.to).toEqual({ f: 0, r: 5 }); // a6
    });

    it('knight on e4 can mirror to d4', () => {
      const state = initialPosition();
      // Place knight on e4
      const board = [...state.board];
      board[3 * 8 + 4] = { kind: 'N', color: WHITE }; // e4 = (4, 3)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 4, r: 3 });

      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1);
      expect(mirrorMoves[0]?.to).toEqual({ f: 3, r: 3 }); // d4
    });

    it('knight mirror ignores path blockers', () => {
      const state = initialPosition();
      // Place knight on a3 with pieces blocking the path to h3
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      board[2 * 8 + 3] = { kind: 'P', color: BLACK }; // d3 = (3, 2) - blocks path
      board[2 * 8 + 6] = { kind: 'R', color: BLACK }; // g3 = (6, 2) - blocks path
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1); // Should still be able to mirror despite blockers
      expect(mirrorMoves[0]?.to).toEqual({ f: 7, r: 2 }); // h3
    });
  });

  describe('mirror captures', () => {
    it('knight on a3 can mirror-capture enemy piece on h4', () => {
      const state = initialPosition();
      // Place knight on a3 with enemy piece on h4
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      board[3 * 8 + 7] = { kind: 'P', color: BLACK }; // h4 = (7, 3) - enemy pawn
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      const mirrorCaptures = moves.filter(
        (m) => m.special === 'mirror' && m.to.f === 7 && m.to.r === 3,
      );
      expect(mirrorCaptures).toHaveLength(1);
      expect(mirrorCaptures[0]?.to).toEqual({ f: 7, r: 3 }); // h4
    });

    it('knight cannot mirror-capture friendly pieces', () => {
      const state = initialPosition();
      // Place knight on a3 with friendly piece on h4
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      board[3 * 8 + 7] = { kind: 'P', color: WHITE }; // h4 = (7, 3) - friendly pawn
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      const mirrorCaptures = moves.filter(
        (m) => m.special === 'mirror' && m.to.f === 7 && m.to.r === 3,
      );
      expect(mirrorCaptures).toHaveLength(0);
    });

    it('knight cannot mirror to empty squares (must be enemy piece for capture)', () => {
      const state = initialPosition();
      // Place knight on a3 with empty h4
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      // h4 is empty (no piece)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [null];
      expect(mirrorMoves).toHaveLength(1);
      expect(mirrorMoves[0]?.to).toEqual({ f: 7, r: 2 }); // h3 (same rank), not h4
    });
  });

  describe('combined scenarios', () => {
    it('knight on a3 has both regular and mirror moves', () => {
      const state = initialPosition();
      // Place knight on a3
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      // Should have regular L-shaped moves + mirror move
      expect(moves.length).toBeGreaterThan(1);

      const regularMoves = moves.filter((m) => !m.special);
      const mirrorMoves = moves.filter((m) => m.special === 'mirror') ?? [undefined];

      expect(regularMoves.length).toBeGreaterThan(0);
      expect(mirrorMoves).toHaveLength(1);
      expect(mirrorMoves[0]?.to).toEqual({ f: 7, r: 2 }); // h3
    });

    it('knight on a3 can capture enemy piece on h4 via mirror', () => {
      const state = initialPosition();
      // Place knight on a3 with enemy piece on h4
      const board = [...state.board];
      board[2 * 8 + 0] = { kind: 'N', color: WHITE }; // a3 = (0, 2)
      board[3 * 8 + 7] = { kind: 'P', color: BLACK }; // h4 = (7, 3) - enemy pawn
      const testState: GameState = { ...state, board };

      const moves = legalMovesFor(testState, { f: 0, r: 2 });

      const mirrorCaptures = moves.filter(
        (m) => m.special === 'mirror' && m.to.f === 7 && m.to.r === 3,
      ) ?? [undefined];
      expect(mirrorCaptures).toHaveLength(1);
      expect(mirrorCaptures[0]?.to).toEqual({ f: 7, r: 3 }); // h4
    });
  });
});
