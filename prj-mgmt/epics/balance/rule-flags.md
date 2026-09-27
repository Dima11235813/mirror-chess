# Story — Per-piece rule flags

> Part of the [balance epic](./README.md). Independent of the engine work — this can
> land first and is useful on its own.

## Summary

As the owner, I want to switch each piece's mirror portal on or off independently, so
that variants can be played, saved, shared and measured — and so the default ruleset
becomes a decision I can revisit rather than something baked into the move generator.

## Design

### The flags themselves

```ts
/** Which pieces cross the seam. Sliders cross by transit (§4), steppers by wrap (§11). */
export interface RuleSet {
  readonly portal: Readonly<Record<Kind, boolean>>
}
```

`RuleSet` belongs **in `GameState`**, not in a module-level global or a React context:

- the core must stay pure and free of ambient state (CLAUDE.md §2);
- a saved game is meaningless without the rules it was played under;
- the study runs many rulesets concurrently in one process.

### Identity: a canonical token, resolved through a registry

A permutation needs a **name that can travel** — into a URL, a saved game, a study
result row, and eventually a network protocol. Decision recorded in
[ADR 0004](../engine/adr/0004-ruleset-identity-and-tokens.md).

**Canonical token** — fixed width, one character per flag, in the fixed order
`B R Q N K P`; the piece letter means on, `-` means off:

| Token | Meaning |
| --- | --- |
| `BRQNKP` | every piece crosses — today's default |
| `BRQ---` | sliders only — the rules as originally specified in §4 |
| `---NKP` | steppers only |
| `------` | **ordinary chess** — the study's control |

Fixed width means it is never empty, it sorts, it aligns in a table of 64 rows, and
`?rules=BRQ---` is legible without a decoder.

**Registry** — a data file mapping tokens to saved definitions:

```ts
export interface RuleSetDefinition {
  readonly token: RuleSetToken
  readonly name: string                  // 'Sliders only'
  readonly aliases: readonly string[]    // ['sliders'] — what a human types
  readonly description: string
  readonly rules: RuleSet
  readonly schema: number                // which flag-set version minted this token
  readonly status: 'default' | 'official' | 'experimental' | 'control'
  readonly study?: RuleSetMetrics        // filled in later by the variant study
}

export function resolveRuleSet(token: string): RuleSetDefinition
```

The registry carries what the bits cannot: a display name, a description, whether a
variant is official, and — the reason it must be *data* rather than code — the measured
metrics the study attaches to each permutation as it learns them.

### The trap: the registry must not be the only way to resolve a token

If a token only means something when it is registered, then no one can share an
unregistered permutation — which would break the north-star goal of players proposing
variants, and make the 64-run study depend on 64 hand-written entries.

So: **a syntactically valid token always resolves**, whether or not it is registered.
An unknown-but-valid token decodes straight from its characters and comes back as
`status: 'experimental'` with a generated name. The registry adds *meaning*, never the
*ability to exist*.

### Forward compatibility

- Token positions are **fixed and append-only**. A seventh flag appends a seventh
  character; a six-character token read by a seven-flag build means "position 7 off".
  Existing saves and links keep meaning exactly what they meant.
- If a flag's *meaning* ever changes rather than a new one being added, bump `schema`
  and prefix the token (`2:BRQ---`). Avoid needing this.
- Absent rules anywhere — an old save, a link without the parameter — resolve to the
  **default token**, not to "all on" hardcoded, so the default stays a single
  changeable fact.

### Threading

`portal` is read in exactly three places, all of which already take the state or board:

| Site | Change |
| --- | --- |
| `moves.ts` `pseudoLegalMovesFor` | skip `portalMoves` for a disabled slider; skip the wrapped branch for a disabled stepper |
| `attacks.ts` `attacksFrom` | the same, so a disabled piece stops *attacking* through the seam |
| `rays.ts` `stepAcrossSeam` | needs to report `wrapped` so callers can drop it — it already does |

**The attack side is the easy thing to forget.** If a flag suppresses moves but not
attacks, kings will be "in check" from a piece that cannot legally reach them, and
every legality test will quietly disagree with the move generator.

### Compatibility

- `initialPosition()` and `fromPiecesSpec()` resolve the **default token**.
- Saved games store the **token**, not the expanded flags — one short stable string
  that survives the flag set growing. Saves written before this story load as the
  default; persistence gains a version marker rather than guessing.
- The URL loader takes `&rules=<token>`, so a variant position shares as a link:
  `?board=w:Bb3&rules=BRQ---`.

## Acceptance Criteria

### The flags
- [x] `RuleSet` exists with a flag per piece kind, and `GameState` carries one.
- [x] The default token reproduces current behaviour exactly — the whole existing suite
      passes unchanged with no test mentioning `RuleSet`.
- [x] Disabling a slider's flag removes its portal **moves and attacks**; the piece
      behaves as in standard chess.
- [x] Disabling a stepper's flag removes its wrapped **moves and attacks**.
- [x] `------` produces ordinary chess: no move anywhere on any board carries
      `special: 'mirror'`.
- [x] Flags are independent — enabling `B` alone does not affect `R` or `Q`.
- [x] The core stays pure — no global, no context, no mutable module state.

### Tokens and the registry
- [x] A token round-trips: `tokenOf(rulesOf(token)) === token` for all 64.
- [x] All 64 tokens are valid and distinct, and each decodes to a distinct `RuleSet`.
- [x] An **unregistered but syntactically valid** token still resolves, as
      `status: 'experimental'` — the registry is not a gate.
- [x] An invalid token (wrong length, unknown character, wrong letter for a position)
      is rejected with a useful message, never silently coerced to the default.
- [x] Registered tokens carry name, description and status; the notable ones
      (`BRQNKP`, `BRQ---`, `------`) are registered with human aliases.
- [x] A short token from an earlier schema resolves with the missing positions **off**,
      proving forward compatibility before there is a seventh flag to test it with.
- [x] A position loaded from `&rules=<token>` uses those rules; without the parameter
      it uses the default. A registered alias (`&rules=sliders`) works too, and an
      unrecognisable value falls back rather than breaking the page.
- [x] A saved game round-trips its **token**; a save written before this story loads as
      the default, as does one with a corrupt token.

## Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Unit | `src/game/rules.test.ts` | the flag type, defaults, and each flag's effect on moves **and** attacks |
| Unit | `src/game/ruleset-registry.test.ts` | the catalogue, aliases, unregistered resolution, untrusted input |
| Unit | `src/game/mirror-portal.test.ts` | unchanged — proves the default token is today's behaviour |
| Unit | `src/game/perft.test.ts` | with `------`, node counts match **published chess perft**; variant baselines pinned |
| Unit | `src/shared/persistence.test.ts` | token round-trips; legacy and corrupt saves fall back to the default |
| E2E | `prj-mgmt/epics/balance/rule-flags.e2e.ts` | a variant link renders the right hints |

The `standard-chess.test.ts` battery is worth building carefully: with all flags off
we can assert against **known perft numbers** for the opening position (20 moves at
depth 1, 400 at depth 2, 8902 at depth 3). That is a rigorous, external check that
the move generator is correct — something the project has never had.

## Status — delivered 2026-08-01

Implemented in `src/game/rules.ts` (flags + token encoding) and
`src/game/ruleset-registry.ts` (the catalogue), threaded through the core via the new
`Position` type in `src/game/types.ts`.

| Check | Result |
| --- | --- |
| `npm run test` | **235 passed**, 2 skipped (was 192 — 43 new) |
| `npm run build` | clean |
| `npx playwright test --workers=1` | 29 passed, 2 skipped |

**The headline result:** with `------`, perft from the opening position is
**20 / 400 / 8,902 / 197,281** — an exact match to the published chess numbers. That is
the first time this move generator has been verified against an authority outside the
project. Depths 1–4 need no en passant, castling or promotion, which is precisely why a
generator lacking them can match; depth 5 introduces en passant and is excluded until
those rules land.

Variant baselines pinned the same day: `BRQ---` → 20 / 400 / 9,690 / 230,114;
`BRQNKP` → 20 / 400 / 9,852 / 238,060.

Patterns arising from this work are documented in
[`docs/design-patterns/`](../../../docs/design-patterns/README.md).

### Completed 2026-08-02 — token wiring

The two items deferred on 2026-08-01 are done:

- **Persistence stores the token**, not the expanded flags. `src/shared/persistence.ts`
  serialises `rules` to `rulesToken` on write and resolves it on read. A save with no
  token (written before rule flags existed) and a save with a *corrupt* token both fall
  back to the default — resolved through the registry, never hardcoded. A damaged field
  should not cost a player their game.
- **A variant travels in a link**: `?board=w:Bb3&rules=BRQ---`, or by alias
  `&rules=sliders`. Unrecognisable values fall back rather than throwing, since a
  shared link is untrusted input.

Verified by `prj-mgmt/epics/balance/rule-flags.e2e.ts`, which shows the same bishop on
`b3` crossing the seam under the default and staying home under `------`.

Final: **239 unit tests**, **34 e2e**, build clean.

## Definition of done

Every piece's portal is a switch; the default is today's game; all-off is ordinary
chess and is verified against published perft counts.
