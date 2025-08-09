# Prevent Wrong Move Feature

## Check

As a user in check, I want to be prevented from making moves that do not resolve the check so that I can only make legal moves.

### Acceptance Criteria
- When a player is in check, they can only make moves that resolve the check.
- If a player attempts to make a move that does not resolve the check, the move should be blocked, and an appropriate message should be displayed (e.g., "Move not allowed: You are in check").
- The game state should remain unchanged if an illegal move is attempted while in check.
- The player should be able to see all legal moves available to them while in check, when in assistance mode.