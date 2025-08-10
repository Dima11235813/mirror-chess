  1) [chromium] › prj-mgmt\epics\game-logic\bishop\bishop-move.e2e.ts:17:3 › mirror-chess: bishop moves › Regular attack: Bc1 captures e3 and stops beyond (no f4,g5,h6)

    Error: Timed out 5000ms waiting for expect(locator).toHaveCount(expected)

    Locator: getByTestId('hint-g5')
    Expected: 0
    Received: 1
    Call log:
      - Expect "toHaveCount" with timeout 5000ms
      - waiting for getByTestId('hint-g5')
        9 × locator resolved to 1 element
          - unexpected value "1"


      25 |     }
      26 |     for (const sq of ['f4', 'g5', 'h6', 'f1']) {
    > 27 |       await expect(page.getByTestId(hintTestId(sq))).toHaveCount(0)
         |                                                      ^
      28 |     }
      29 |   })
      30 |
        at C:\Dev\mirror-chess\prj-mgmt\epics\game-logic\bishop\bishop-move.e2e.ts:27:54

    Error Context: test-results\prj-mgmt-epics-game-logic--b1b44-d-stops-beyond-no-f4-g5-h6--chromium\error-context.md
