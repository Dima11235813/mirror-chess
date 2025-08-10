  2) [chromium] › prj-mgmt\epics\game-logic\knight\board.e2e.ts:6:3 › mirror-chess: knight moves from a3 › Knight A3: Regular moves (b1, b5, c1, c3) + Mirror move (h3)

    Error: Timed out 5000ms waiting for expect(locator).toHaveCount(expected)

    Locator: getByTestId('hint-c1')
    Expected: 1
    Received: 0
    Call log:
      - Expect "toHaveCount" with timeout 5000ms
      - waiting for getByTestId('hint-c1')
        9 × locator resolved to 0 elements
          - unexpected value "0"


      12 |     // Validate that required move hints are displayed
      13 |     for (const sq of KNIGHT_MIRROR_A3_SCENARIO.mustHints) {
    > 14 |       await expect(page.getByTestId(`hint-${sq}`)).toHaveCount(1)
         |                                                    ^
      15 |     }
      16 |
      17 |     // Validate that invalid move hints are NOT displayed
        at C:\Dev\mirror-chess\prj-mgmt\epics\game-logic\knight\board.e2e.ts:14:52

    Error Context: test-results\prj-mgmt-epics-game-logic--caaad-b1-b5-c1-c3-Mirror-move-h3--chromium\error-context.md

  2 failed
    [chromium] › prj-mgmt\epics\game-logic\bishop\bishop-move.e2e.ts:17:3 › mirror-chess: bishop moves › Regular attack: Bc1 captures e3 and stops beyond (no f4,g5,h6)
    [chromium] › prj-mgmt\epics\game-logic\knight\board.e2e.ts:6:3 › mirror-chess: knight moves from a3 › Knight A3: Regular moves (b1, b5, c1, c3) + Mirror move (h3)
  4 skipped
