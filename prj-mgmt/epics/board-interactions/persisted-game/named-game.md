# Named Game Feature

## Add name to game Story

As a user, I want to be able to add a name to a game so that I can easily identify it. 

## Acceptance Criteria
- There should be a minimum of 3 characters and a maximum of 200 characters. 
- Once this is updated in the UI, the game should be saved with the new name. 
- The user input handler should be debounced to prevent excessive saves.
- The validation should ensure that any character that can be saved in local storage can be saved in the game name.