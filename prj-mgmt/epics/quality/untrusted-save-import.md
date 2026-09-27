# Story — An imported save file is trusted completely

> **Status: DONE (2026-09-27).** `parseSavedGame` replaces the cast; the import path no
> longer contains `as GameState`. Part of the [quality epic](./README.md).

## Summary

As the owner, I want an imported save file to be validated before it becomes game state, so
that a malformed or hostile file produces a clear refusal instead of a corrupted app.

## 1. What the code does now

`SavedGamesList.tsx` reads a user-chosen `.json`, and for each entry:

```ts
if (game && typeof game === 'object' && 'state' in game && 'name' in game) {
  saveGame(game.state as GameState, game.name as string)
}
```

The checks are that two **keys exist**. `as GameState` is then a claim with nothing behind
it: the board may be absent, the wrong length, hold pieces of unknown kind or colour, or not
be an array at all. The name may be any type or any length — `isValidGameName`, which the
rename path enforces, is bypassed entirely on import.

`readAll()` does validate on the way *out* of storage, but only that `id`, `savedAt` and
`state` exist — not the state's shape.

## 2. Why this is filed as robustness, not as a vulnerability

Stated plainly so nobody has to re-derive it:

- **No code execution.** React escapes by default and nothing in this app uses
  `dangerouslySetInnerHTML`, `innerHTML` or `eval`, so a crafted string cannot become
  script.
- **No exfiltration.** There is no server and no network call to carry anything anywhere.
- **The attacker must persuade the owner to import a file they chose themselves.**

What a hostile file *can* do is corrupt local state, crash the board renderer, or wedge the
app on every load until storage is cleared. That is unpleasant, not dangerous — today.

**It will stop being only that.** Solve telemetry and accounts
([`../puzzles/solve-logging.md`](../puzzles/solve-logging.md)) add a server, and the day any
stored state is uploaded or shared is the day an unvalidated `as GameState` becomes an input
to someone else's system. Validating at the boundary is much cheaper now than then.

## 3. The fix, in the repo's own idiom

`docs/design-patterns/parse-dont-validate.md` already describes the pattern this file should
use, and `parseRuleSetToken` is the example: a branded type obtainable only by parsing. The
import path should do the same — parse an untrusted object into a `GameState`, or reject it.

- A `parseSavedGame(unknown): SavedGame | null` in `src/shared/persistence.ts`, checking the
  board is 64 entries of `null | { kind, color }` with known values, the turn is a colour,
  and the numeric fields are finite integers.
- Import reports what it refused: "3 of 5 games imported; 2 were not valid saves."
- The name goes through `isValidGameName`, as the rename path already does.
- `readAll()` uses the same parser, so a save corrupted in place is dropped rather than
  loaded.

## 4. Acceptance Criteria

- [x] `parseSavedGame` exists, is documented, and is the **only** way an untrusted object
      becomes a `SavedGame` — no `as GameState` anywhere on the import path.
- [x] Unit tests cover: wrong board length, unknown piece kind and colour, non-colour turn,
      fractional/negative/NaN counters, name too long, name too short, name of the wrong
      type, `null`, an array, `{}`, and a well-formed file. **9 tests.**
- [x] Importing a file with some bad entries imports the good ones and **says** how many it
      refused, in a live region.
- [x] An older save missing the newer fields is still accepted — a *missing* field is an old
      save, a *wrong* field is a bad one, and refusing the first would break real saves.
- [ ] `readAll()` parses rather than casts, so corrupt storage degrades to "no saves".
      **Still open**: `readAll` keeps its looser shape check, so a save corrupted *in place*
      is still loaded. Lower risk than the import path, which is why it went second.
- [ ] An integration test imports a hostile file and asserts the app still renders. Blocked
      on `SavedGamesList.spec.ts`, which is part of the known 13-failure component debt.

## 5. What we learned

The test fixture for the parser invented a `CastlingRights` shape — flat `whiteKing` /
`whiteQueen` keys instead of the real `{ white: { king, queen }, … }`. It failed loudly,
which is the good case, but it is the **third** fixture this session written from memory
rather than from the type. The rule in CLAUDE.md §8 keeps earning its place.

## 6. Related

The same reasoning applies to anything that later accepts a *shared* game — a link, a PGN
paste, a network message. The rule to carry forward: **a trust boundary needs a parser, not
a cast**, and the boundary is wherever data arrives that this build did not produce.
