# Persist Settings

> **Status: DONE (2026-10-09).** `src/shared/settings.ts`, proved by
> `src/shared/settings.test.ts` and the reload test in
> [`../../user-moves/move-piece/inspect-and-confirm.e2e.ts`](../../user-moves/move-piece/inspect-and-confirm.e2e.ts).

As a user, I want my settings to be saved and persist across sessions so that I don't have
to reconfigure them each time I use the application.

## Acceptance Criteria

- [x] User settings are saved locally on the user's device (`localStorage`, under a
      versioned key: `mirror-chess:settings:v1`).
- [x] On reopening the application they are loaded and applied.
- [x] A change is saved immediately and persists for future sessions.
- [x] **No loss of settings data when the application is updated.** This is the criterion
      that decided the implementation — see §1.

## 1. Why this is a parser and not a `JSON.parse`

"No loss when the application is updated" is really a statement about **trust**:
`localStorage` outlives the code that wrote it. A value written by a future version will
one day be read by an older one; a value can be hand-edited in devtools; and in a private
window the accessor itself can throw.

So `parseSettings` reads field by field with a default for anything missing or of the wrong
type, and never casts. The consequences are all deliberate:

| Stored | Result |
| --- | --- |
| `{ autoSubmit: false }` | kept |
| `{ autoSubmit: "false" }` | **defaults** — a string is not a boolean, and coercing it would turn a typo into a behaviour change |
| `{ autoSubmit: false, soundOn: true }` | `autoSubmit` kept, unknown field dropped — a newer version wrote it |
| `"{not json"` or `null` or `[]` | defaults, no throw |
| storage throws (private mode) | defaults, and the app opens |

`parseSettings` never returns a partial object, because its callers destructure
`autoSubmit` without checking — a parser that can return `{}` moves the problem rather
than solving it.

See `docs/design-patterns/parse-dont-validate.md` and CLAUDE.md §8, *"A trust boundary
needs a parser, not a cast"*.
