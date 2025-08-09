Here’s the bug report, filled out using the template we made.

# \[Mirror Move] Pawn\@A4 shows illegal H4 and misses mirror capture on H8

**Summary**
With Mirror rules enabled, the white pawn on **A4** should be able to advance to **A5** (normal move). It should **not** be able to move to **H4**. Its mirror projection should indicate a **capture on H8** (red dot), because the pawn’s forward move mirrored across side boards projects onto **H8** where a black rook sits.

**Environment**

* App/Module: Mirror Chess – move highlighting
* Mirror mode: On (L/C/R boards; center is real)
* Turn: White
* Browser/OS: *fill in*
* Commit/Build: *fill in*

**Board Setup (notation)**
*Query-string style used by app (concise):*

```
?board=w:Pa4,Pb3,Pc2,Pd2,Pe2,Pf2,Pg2,Ph2,Ra1,Rh1,Nb1,Ng1,Bc1,Bf1,Qd8,Ke1;
      b:Ra8,Rh8,Nb8,Ng8,Bc8,Bf8,K e8,Pa7?,Pb7,Pc7,Pd6,Pe7,Pf7,Ph5
&turn=white
```

*Approximate FEN for human reference (matches screenshot intent):*

```
rnbQkbnr/1pp1ppP1/3p4/7p/P7/1P6/2PPPPPP/RNB1KBNR w KQkq - 0 1
```

(*If using tests, prefer the query-string your harness accepts; the FEN is only to visualize.*)

**Steps to Reproduce**

1. Load the position above with **Mirror mode ON**.
2. Click the white pawn on **A4**.
3. Observe the highlighted squares.

**Expected Result**

* **Green (legal move):** **A5**
* **No highlight:** **H4** (not a legal mirror move)
* **Red (legal capture via mirror projection):** **H8** (black rook on H8)

**Actual Result**

* **A5** is highlighted (✅).
* **H4** is incorrectly shown as a green destination (❌).
* **H8** capture is **not** shown/red (❌).

**Impact**

* Users are shown an illegal lateral pawn move and miss a valid mirror capture, leading to rule confusion and potential engine/UX divergence for pawns on edge files.

**Attachments**

* Screenshot: `a4-pawn-mirror-bug.png` (provided)

**Diagnostics / Notes (hypothesis)**

* Pawn mirror logic is likely:

  * Treating a mirror as a **same-rank translation** (A4→H4) instead of projecting the **forward vector** across boards and wrapping on the file seam, or
  * Not re-mapping the *forward* mirror landing square to center-board **H8**, or
  * Filtering mirror captures using center-path checks inappropriate for pawns.

**Tests to Add/Adjust**

* **Unit:** `src/game/pawn.mirror.test.ts`

  * Case: `A4 (white) -> {A5 green, H8 red, H4 none}`
  * Symmetric: `H5 (black) -> {H4 green, A1 red, A5 none}`
* **E2E:** `prj-mgmt/epics/game-logic/pawn/pawn-highlight-mirror.e2e.ts`

  * Load query string above; assert highlights: green={A5}, red={H8}, absent={H4}.

**Owner**

* Assignee: *fill in* • Reviewers: *fill in*

**Status / Links**

* Issue #: *fill in* • PR: *fill in* • Related: mirror-knight edge-case issue

---

Playwright spec that loads this exact position and asserts green={A5}, red={H8}, and that H4 is absent?

Sweet — here’s a ready-to-drop Playwright spec. I used simple, resilient selectors via `data-square` for board squares and `data-hint` for highlight dots. If your app uses different hooks, just tweak the 3 selector constants at the top.

```ts
// proj-mgmt/pawn-mirror-a4.spec.ts
import { test, expect, Page } from '@playwright/test';

// === Adjust these to match your DOM once: ===============================
const SQUARE = (sq: string) => `[data-square="${sq.toLowerCase()}"]`;
const HINT_IN = (sq: string) => `${SQUARE(sq)} [data-hint]`;               // any hint
const HINT_COLOR_IN = (sq: string, color: 'green' | 'red') =>
  `${SQUARE(sq)} [data-hint="${color}"]`;
// ========================================================================

// Position under test (mirror mode ON, white to move).
// Use your app’s query-string format. Keep exactly as one line.
const POSITION_QS =
  '?board=w:Pa4,Pb3,Pc2,Pd2,Pe2,Pf2,Pg2,Ph2,Ra1,Rh1,Nb1,Ng1,Bc1,Bf1,Qd8,Ke1;' +
  'b:Ra8,Rh8,Nb8,Ng8,Bc8,Bf8,Ke8,Pb7,Pc7,Pd6,Pe7,Pf7,Ph5&turn=white';

async function gotoPosition(page: Page) {
  // relies on baseURL in playwright.config.ts
  await page.goto('/' + POSITION_QS);
  // sanity: board renders and a4 exists
  await expect(page.locator(SQUARE('a4'))).toBeVisible();
}

test.describe('Mirror Chess — Pawn A4 mirror behavior', () => {
  test('A4 shows A5 (green), H8 (red capture), and NOT H4', async ({ page }) => {
    await gotoPosition(page);

    // 1) Select the pawn on A4
    await page.click(SQUARE('a4'));

    // 2) Expect green move A5
    await expect(page.locator(HINT_COLOR_IN('a5', 'green'))).toBeVisible();

    // 3) Expect red capture on H8 (mirror projection)
    await expect(page.locator(HINT_COLOR_IN('h8', 'red'))).toBeVisible();

    // 4) Ensure NO hint on H4 (illegal lateral)
    await expect(page.locator(HINT_IN('h4'))).toHaveCount(0);
  });
});
```

### Notes

* If your app currently uses different hooks (e.g., `.hint--green` / `.hint--red`), change the selector helpers to match, e.g.:

  ```ts
  const HINT_COLOR_IN = (sq: string, color: 'green'|'red') =>
    `${SQUARE(sq)} .hint--${color}`;
  ```
* Run it headful to watch the highlights:

  ```
  npx playwright test proj-mgmt/pawn-mirror-a4.spec.ts --headed --ui
  ```
* If you keep test files next to source, just move this under your configured `testDir` and it’ll be discovered automatically.

Want me to add a companion unit test (Vitest) that checks the pure move generator for `{ A5: green, H8: red, H4: none }` too?



When we complete this bug report and implement the fix, we should also update the folder with markdown files for various features like pawn attack/move and mirror variants of them as shown in the bishop feature folder.







