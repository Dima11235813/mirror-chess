# Games List Json File Feature

## Download

As a user with a list of saved games, I want to be able to download the list as a JSON file, so that I can easily share or back up my saved games.

### Acceptance Criteria
- Given I have a list of saved games, when I click the "Download Games List" button, then a JSON file containing the list of saved games should be downloaded to my device.
- Given I have no saved games, the "Download Games List" button shouldn't be displayed.
- File name should include mirror chess and current date, e.g., `mirror-chess-games-YYYY-MM-DD.json`.
- The JSON file should be properly formatted and include all relevant game details (e.g., game ID, players, date, status) for each saved game.
- The download functionality should work across all major browsers (Chrome, Firefox, Safari, Edge).
- The button should be accessible and usable via keyboard navigation and screen readers.
- The feature should be tested to ensure it works correctly and does not introduce any bugs or performance issues.
- The feature should be documented have two e2e tests, on for when there are saved games and one for when there are none.
- The unit tests should cover validating no saved games list leads to no button, and a saved games list leads to a button that when clicked downloads the correct file.