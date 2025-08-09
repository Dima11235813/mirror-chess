Here’s the full write-up using our move-highlight bug template — separating the two issues while referencing the same board state.

---

# \[Mirror Move] Knight\@A3 missing mirror move to H3 and missing mirror attack on H4

**Summary**
In Mirror Chess mode, the white knight on **A3** has two issues:

1. It **cannot move** to **H3** via mirror projection (should be a legal mirror move).
2. It **cannot attack** **H4** (black pawn) via mirror projection (should be a red capture).

**Environment**

* App/Module: Mirror Chess – move generation & highlight UI
* Mirror mode: On (L/C/R boards; center board is “real”)
* Turn: White
* Browser/OS: *fill in*
* Commit/Build: *fill in*

**Board Setup (query-string for our app)**

```
?board=w:Na3,Pa5,Pb2,Pc3,Pe2,Pf2,Ph2,Ra1,Bc1,Qd2,Ke1,N g1;
      b:Ra8,Bc8,Bf8,Qd8,Ke8,Ng8,Pa7,Pb5,Pc7,Pd5,Pe6,Pf6,Pg4,Ph6
&turn=white
```

(*FEN omitted; mirror mode + this position is sufficient to reproduce.*)

---

## Bug 1 — Missing Mirror Move to H3

**Steps to Reproduce**

1. Load the position above.
2. Click the **white knight on A3**.
3. Observe the highlighted move squares.

**Expected Result**

* Knight legal moves should include **H3** via mirror projection.

**Actual Result**

* H3 is **not** highlighted; move unavailable.

**Impact**

* Removes valid knight mobility in mirror mode; affects tactics near A/H seam.

**Suspected Cause**

* Knight mirror-move transform may be excluding file-wrap moves if the target square is unoccupied but reached via mirror seam.

---

## Bug 2 — Missing Mirror Attack on H4

**Steps to Reproduce**

1. Load the same position.
2. Click the **white knight on A3**.
3. Observe the highlighted capture squares.

**Expected Result**

* Knight legal moves should include a **red capture** on **H4** (black pawn) via mirror projection.

**Actual Result**

* H4 is not highlighted at all; capture unavailable.

**Impact**

* Removes a legal attack; potential tactical oversight in move generation.

**Suspected Cause**

* Mirror attack generation for knights may:

  * Not check occupancy for seam-wrapped target squares,
  * Or filter them out if the original (side board) square is empty.

---

**Attachments**

* Screenshot: `knight-a3-mirror-bug.png` (provided)

**Tests to Add/Adjust**

* **Unit:** `mirrorKnightMoves.spec.ts`

  * For `w:Na3` → legal set includes `{ ..., h3: move, h4: capture }` when h4 is enemy-occupied.
* **E2E:** `knight-a3-mirror.spec.ts`

  * Load this position; assert green at H3, red at H4.

**Owner**

* Assignee: *fill in* • Reviewers: rules/engine + UI

**Status / Links**

* Related issues: Knight mirror target missing (earlier A3→H6 bug)
* PR: *fill in*

---

Do you want me to go ahead and **write the Playwright E2E spec** for this so we can lock these knight mirror cases down in CI? That would be similar to the pawn-mirror specs we’ve already built.
