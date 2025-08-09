# Save Game Feature

The Save Game feature allows users to save their current game state and resume it later. This is particularly useful for long games or when users need to take a break.

## Implementation Details
- **Data Structure**: The game state is serialized into a JSON object that includes the current board configuration, player turns, and any other relevant game metadata.
- **Storage**: The serialized game state is stored in the browser's local storage with a TODO for later integrating a backend database.

## Save Button Story

As a user that is viewing a game with at least one move made, I want to be able to save the game so that I can resume it later.

### Acceptance Criteria
- Given that I am viewing a game with at least one move made, when I click the "Save Game" button, then the current game state should be saved to local storage.
- Given that I have saved a game, when I return to the game page, then I should see an option to load the saved game state.
- A list of saved games should be displayed, allowing me to select and load a specific game state.


