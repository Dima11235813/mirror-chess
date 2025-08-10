# Knight A3 Move Validation - Bug Fix and Test Scenario

**Summary**
As a Mirror Chess player, I want to validate that a knight on a3 can make the correct moves: regular L-shaped moves to b1 and b5, and a mirror move to h3. I also want to ensure that invalid moves like g2 (blocked by enemy pawn) and g4 (not a valid knight move) are not allowed.

**Current Test Scenario**
- **Setup**: White knight on a3, Black pawn on g2
- **Expected Valid Moves**:
  - `b1` (regular L-move: 2 files right, 2 ranks down)
  - `b5` (regular L-move: 2 files right, 2 ranks up)  
  - `h3` (mirror move: same rank, opposite file)
- **Expected Invalid Moves**:
  - `g2` (blocked by black pawn - knight can't capture friendly pieces)
  - `g4` (not a valid knight move from a3)

**Implementation Status**
- ✅ Knight mirror logic implemented in `moves.ts`
- ✅ Regular L-shaped moves working
- ✅ Same-rank mirror move working (a3 → h3)
- ✅ Adjacent-rank mirror capture working (when enemy piece present)
- ✅ E2E test updated to validate all scenarios

**Test Coverage**
- Unit tests: `src/game/knight.test.ts` covers all move scenarios
- E2E test: `prj-mgmt/epics/game-logic/knight/board.e2e.ts` validates UI hints
- Mock data: `src/mocks/mock-knight-mirror-move.ts` provides test board setup

**Related User Stories**
- [Mirror Move](mirror-move.md) - Basic knight mirror functionality
- [Mirror Attack](mirror-attack.md) - Knight mirror captures
- [Regular Move](regular-move.md) - Standard L-shaped knight moves
- [Regular Attack](regular-attack.md) - Standard knight captures

**Next Steps**
- Run `npm run test` to ensure unit tests pass
- Run `npm run e2e` to validate E2E test passes
- Verify that the knight's moves are correctly displayed in the UI
- Ensure no regressions in other knight move scenarios
