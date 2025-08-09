Got it—here’s a tight bug report plus a linked user story with acceptance criteria for project management.

# Bug: Mirror En Passant not offered for Pawn @ A5 (should capture on H7)

**Summary**
After Black advances a pawn two squares on the mirror file (**H7 → H5**), White’s pawn on **A5** should be offered a **mirror en passant** capture landing on **H7**. The UI only shows **A6** (single push) and omits the capture.

**Environment**

* Feature: Mirror rules (three-board projection; center is real)
* Module: Move generation + highlight hints
* Turn: White, immediately after Black plays **H7→H5**
* Build/Commit: *fill in*
* Browser/OS: *fill in*

**Required Move History (en passant precondition)**

* Previous (just-completed) move: **Black pawn H7 → H5** (two-square advance)
* En-passant target recorded in game state for mirror logic.

**Board Setup (query-string for our app)**

```
?board=w:Pa5,Bc1,Bf1,Kg1,Qd2,Ra1,Rh1,Nb1,Ng1,Pc2,Pe2,Pf2,Pg2;
      b:Ra8,Rh8,Bc8,Bf8,Nb8,Ng8,Ke8,Pb7,Pc7,Pd5,Pe6,Pf6,Pg6,Ph5,Qd8
&turn=white
&lastMove=h7h5
```

*(FEN omitted because mirror metadata + lastMove are required; use the query-string your loader expects.)*

**Steps to Reproduce**

1. Load the position above with `turn=white` and `lastMove=h7h5` (or reproduce by playing H7→H5).
2. Click the white pawn on **A5**.
3. Observe the move/capture highlights.

**Expected Result**

* **Green:** **A6** (single push)
* **Red (mirror en passant):** **H7**

  * Executing this move should:

    * Land White pawn on **H7** (center board),
    * Remove the **black pawn from H5** (the pawn that moved two squares),
    * Update halfmove clock per chess rules, clear en-passant target, and toggle turn.

**Actual Result**

* Only **A6** is highlighted (green).
* **H7** capture is not offered; en passant is unavailable.

**Impact**

* Pawn rules are incomplete under Mirror mode; users cannot perform legal mirror en passant captures, causing incorrect gameplay and test flakiness near file seams.

**Suspected Cause (hypothesis)**

* En-passant generator checks only orthodox adjacency (A-file vs B-file) and ignores mirror seam mapping (A↔H).
* EP target square derived from orthodox move (`h6`) rather than mirror landing (`h7`) per our variant.
* State machine may not propagate `lastMove`/`epTarget` into mirror transform.

**Tests to Add/Update**

* **Unit:** `mirrorPawn.enPassant.spec.ts`

  * Given `lastMove=h7h5`, `w:Pa5` → legal set includes `{ a6: move, h7: capture(ep) }`.
  * Symmetry: `b:Ph4`, `lastMove=a2a4` → `{ h3: move, a2: capture(ep) }`.
* **E2E (Playwright):** `mirror-ep-a5-h7.spec.ts`

  * Load query string above; click A5; expect green at A6, red at H7, and that executing H7 removes H5 pawn.

**Attachments**

* Screenshot: `mirror-ep-a5-missing.png` (provided)

**Owner**

* Assignee: *fill in* • Reviewers: rules/engine + UI

**Status / Links**

* Related issues: Pawn mirror projection, Pawn lateral false positive (A4→H4)
* PR: *fill in*

---

# User Story: Mirror En Passant

**As a** player using Mirror Chess rules,
**I want** en passant to work for both normal and mirror-projected pawn interactions across the A/H seam,
**so that** pawn play follows complete rules and edge-file tactics are valid.

## Acceptance Criteria

1. **State Preconditions**

   * When a pawn moves two squares (e.g., `h7→h5` or `a2→a4`), the engine records an EP opportunity scoped to the immediate next move for the opponent.
   * This EP state is exposed to both the move generator and the UI highlighter.

2. **Normal En Passant (orthodox)**

   * If `b7→b5` and an enemy pawn sits on `a5` or `c5`, show a red capture landing on `b6`, remove the pawn from `b5` upon execution.

3. **Mirror En Passant (A/H seam)**

   * If `h7→h5` and an enemy pawn occupies `a5`, show a **red** capture landing on **H7**, removing the pawn from **H5** on execution (mirror landing per variant).
   * If `a2→a4` and an enemy pawn occupies `h4`, show a red capture landing on **A2**, removing the pawn from **A4** on execution.
   * Mirror EP is only available **immediately** after the two-square move, consistent with standard EP timing.

4. **UI / Hints**

   * EP squares are shown with the **capture (red) hint** even if the destination is empty (like orthodox EP).
   * No illegal lateral hints (e.g., A-file pawn must not show H-file **moves**; only mirror EP **captures** when eligible).

5. **Execution & Validation**

   * Performing a mirror EP:

     * Lands on the specified mirror square (H7/A2 per cases above).
     * Removes the correct enemy pawn (H5/A4).
     * Updates clocks (halfmove reset), clears EP state, flips turn.
     * Produces a legal move in the PGN/notation used by the app (include an EP marker if you support it).

6. **Regression Coverage**

   * Unit tests cover both colors, both seams (A↔H) and inner files (orthodox).
   * E2E tests verify highlights, click behavior, captured piece removal, and post-move state.

7. **Performance/UX**

   * No measurable delay in highlights when EP is available.
   * EP availability disappears after any unrelated move (standard rule).

---

If you want, I can also add the Playwright spec (`mirror-ep-a5-h7.spec.ts`) that sets `lastMove=h7h5`, asserts the red hint on **H7**, clicks it, and verifies the **H5** pawn disappears and White’s pawn lands on **H7**.
