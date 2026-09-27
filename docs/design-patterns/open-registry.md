# Open registry

## The problem

A token encodes six flags and nothing else. It cannot say "this one is ordinary chess
and we use it as a correctness oracle", and it has nowhere to record that a permutation
scored 51.2% for White over a thousand self-play games.

So we want a catalogue. The trap is making the catalogue **authoritative**: if a token
only means something when it is registered, then nobody can share an unregistered
variant, and a study over 64 permutations depends on 64 hand-written entries.

## How it looks here

The registry is a lookup with a **fallback**, not a gate.

```ts
// src/game/ruleset-registry.ts
export function resolveRuleSet(raw: string): RuleSetDefinition {
  const byAlias = BY_ALIAS.get(raw.toLowerCase())
  if (byAlias) return byAlias

  const token = parseRuleSetToken(raw)
  return BY_TOKEN.get(token as string) ?? experimentalDefinition(token)
}
```

A catalogued token returns its entry, with a name, a description and a status. A valid
but uncatalogued one is synthesised on the spot:

```ts
resolveRuleSet('BRQ---').name   // 'Sliders only'   (catalogued, status 'official')
resolveRuleSet('B-----').name   // 'Variant B-----' (synthesised, status 'experimental')
resolveRuleSet('QRB---')        // throws — still not a valid token
```

The catalogue adds **meaning**, never the **ability to exist**. That single property is
what keeps all 64 permutations playable and shareable while only three are named.

Entries are plain data, deliberately:

```ts
const DEFINITIONS: readonly RuleSetDefinition[] = [ /* ... */ ]
```

When the variant study starts writing measured metrics back, this becomes a JSON
document loaded here rather than a literal — no consumer changes.

## What it buys

- **Open/closed, properly.** Adding a variant is adding data. Nothing branches on which
  ruleset is in play.
- **Sharing works for anything.** `?rules=B-----` resolves for a permutation nobody
  named, which is the first step toward players proposing their own variants.
- **One place for metadata**, including balance metrics the study will attach later.
- **Aliases for humans.** `sliders` and `standard` are what you type; `BRQ---` and
  `------` are what is stored.

## What it costs

- A synthesised entry is thin — a generated name and no description. Fine for something
  nobody has named, and it must never be mistaken for a curated one, which is why
  `status: 'experimental'` is explicit rather than inferred from absence.
- Two ways in (alias or token) means two failure modes to test. `tryResolveRuleSet`
  exists so untrusted callers get `null` instead of an exception — see
  [Parse, don't validate](./parse-dont-validate.md).
- Once a token is published its meaning is frozen; the registry becomes a compatibility
  surface. That is the trade-off accepted in
  [ADR 0004](../../prj-mgmt/epics/engine/adr/0004-ruleset-identity-and-tokens.md).

## Where else it appears

- [Rules as data](./rules-as-data.md) — the level below: what a registry entry contains.
- [Oracle testing](./oracle-testing.md) — the `------` entry is catalogued as the
  `control` precisely because it has a job in the test suite.
