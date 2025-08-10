# King Check Game Logic Feature

---

## **Prevent Moving Into Check** Story

**As a player,** I want the game to automatically prevent me from making any move that would place my own king into check (including mirror chess rules), **so that** I can only make legal moves according to the rules of chess and avoid accidentally losing due to an illegal self-check.

### Acceptance Criteria

- When a player makes a move that would put their own king into check, the game should prevent the move from being made.
- The game should display an error message to the player explaining why the move is illegal.
- The game should highlight the square that the king is in check from.
- The game should highlight the piece that is causing the check.
- The game should highlight the square that the king can move to to get out of check.


---

## **Detect Mirror Check Threats**

**As a player in mirror chess,** I want the game to detect threats to my king not only from pieces on the same board but also from pieces attacking via mirrored boards, **so that** I can avoid making moves that would place my king in check from a mirror attack.

---

## **Block Illegal Moves That Cause Check**

**As a player,** I want the game to stop my move from being executed if it results in my king being under check (normal or mirror), **so that** I never have to manually track whether my move is legal.

---

## **Highlight Check-Causing Moves**

**As a player,** I want the interface to highlight attempted moves that would cause my king to be in check, **so that** I get immediate visual feedback explaining why the move is illegal.

---

## **Validate All Opponent Moves**

**As a player,** I want the game to ensure that my opponent’s moves never result in their king being in check at the end of their turn, **so that** the rules are consistently enforced for both players.

---

## **Display Check State Immediately**

**As a player,** I want the board to visually indicate when my king is in check, including from a mirror threat, **so that** I am aware of the danger and can focus on moves that remove the check.

---

If you want, I can also **add acceptance criteria for each user story** so they’re ready for your project management system. That way this “King Check” feature can immediately be turned into test cases for your e2e Playwright suite.
