# Story — Solve logging that cannot be traced back to the player

> **Status: BACKLOG — decided in principle (owner, 2026-09-26), blocked on the product
> scaffolding it implies.** Part of the [puzzles epic](./README.md). Partially answers
> CLAUDE.md §11 decision 4 (when auth arrives).

## Summary

As the owner, I want opted-in solve data that calibrates puzzle difficulty, and I want it
to be **structurally impossible** to tie that data back to a person's Google identity — so
that the promise made at sign-up is kept by the architecture rather than by policy.

## 1. Why this exists

Difficulty cannot be predicted from a position. The state of the art manages MAE ≈ 259
Glicko points with 4.2 million rated puzzles, and Maia-style human-move prediction — the
principled method — cannot transfer, because it needs millions of human games in *this*
variant ([research](../../research/puzzle-difficulty-and-novelty.md)).

So the only real calibration is people solving puzzles. **That data cannot be collected
retroactively**, which is why the logging shape matters before the library grows.

## 2. The promise

> The account knows who you are. The gameplay data does not, and we cannot join them.

Two separate stores, by design:

| | Account side | Gameplay side |
| --- | --- | --- |
| Holds | Google identity, email, marketing consent | puzzle id, solved/failed, wrong moves, time, ruleset |
| Keyed by | the Google account | a **pseudonym** with no derivation from the account |
| May be joined to the other | — | **no** |

The owner's framing, recorded verbatim in intent: the account side exists for the product
and for marketing; the gameplay side is *intentionally obfuscated* from it, and that is
stated clearly during onboarding rather than buried.

## 3. What makes the promise true rather than stated

This is the part that is easy to get wrong later, by one well-meaning join.

- **The pseudonym must not be a function of the account.** A hash of the Google subject id
  is re-linkable by anyone holding both — the same hash recomputes on demand. It must be a
  **random identifier generated on the device**, stored with the player's local data, and
  never sent alongside a credential.
- **No join key may exist anywhere.** If a mapping is ever written — even in a log, even to
  debug an issue — the promise is broken from that moment, retroactively. There is no
  mapping to delete because there is never one to write.
- **Opt-in is per-device and revocable**, and revoking regenerates the pseudonym, so future
  data cannot be linked to past data either.
- **No free text, no timestamps finer than needed.** Solve *duration* is the signal; a
  wall-clock timestamp is a correlation handle. Record duration and a coarse bucket (day),
  not the instant.

### 3.1 The honest limit of the claim

**With few players, correlation can still re-identify.** If three people have accounts and
one solves a puzzle at a known moment, the gameplay row is effectively theirs. Pseudonymity
is not anonymity at small N, and a session that both authenticates and uploads gameplay in
the same request is linkable at the network layer whatever the payload says.

So the claim to make at onboarding is the true one — *we do not store a way to connect
these, and we do not try* — not "it is impossible to ever infer". Overclaiming here is
worse than saying nothing, because it is the kind of promise a user cannot check.

Mitigations worth taking when the backend exists: send gameplay on a separate,
unauthenticated endpoint; batch it rather than posting per solve; drop IP at the edge.

## 4. What gets recorded

Per attempt, the minimum that calibrates a band:

| Field | Why |
| --- | --- |
| `puzzleId`, `rulesetToken` | which puzzle, under which rules |
| `solved` | the outcome |
| `wrongMoves` | tries before the answer — the cleanest difficulty signal |
| `durationMs` | time to solve, the second signal |
| `revealed` | whether they gave up |
| `pseudonym` | to tell "one player found this hard" from "ten players did" |
| `schemaVersion` | so a format change is visible rather than silent |

Deliberately **not** recorded: when (beyond a day bucket), where, which device, anything
free-text, and any account field.

## 5. Acceptance Criteria

- [ ] Attempts are logged locally from the first version, behind an explicit opt-in that
      defaults to **off**.
- [ ] The pseudonym is randomly generated on the device and is **provably not derived** from
      any account field — asserted by a test that the same account produces different
      pseudonyms.
- [ ] Revoking consent clears the local log and regenerates the pseudonym.
- [ ] No code path writes an account identifier and a pseudonym in the same record; a test
      asserts the logged record's fields are exactly the §4 list.
- [ ] Onboarding states the separation in plain words, including the §3.1 limit.
- [ ] Logged attempts feed the difficulty calibration in
      [`difficulty-and-novelty.md`](./difficulty-and-novelty.md) — the bands are checked
      against real attempts, and may report "not enough data".
- [ ] Nothing is uploaded until the backend exists and the separation above is implemented
      on it; local-only until then.

## 6. Open, and out of scope here

- **Where the backend lives**, and whether gameplay upload is a separate service. That is
  the networking decision in CLAUDE.md §11.4.
- **Glicko-2 for puzzle ratings** once there are enough attempts — that is what Lichess
  does, and it is the right model. It needs volume this project will not have for a while.

## Definition of done

Opted-in solve data that calibrates difficulty, with a separation a reader can verify in
the code and a claim at onboarding that is exactly true.
