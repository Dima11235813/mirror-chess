# Parse, don't validate

## The problem

A ruleset token is a string — but only 64 strings out of infinitely many are valid. If
the type is `string`, every function that receives one has to wonder whether somebody
checked it, and the usual outcome is that everybody checks defensively, or nobody does.

## How it looks here

Validate **once**, at the boundary, and return a type that only valid values inhabit.

```ts
// src/game/rules.ts
export type RuleSetToken = string & { readonly __brand: 'RuleSetToken' }

export function isRuleSetToken(raw: string): raw is RuleSetToken
export function parseRuleSetToken(raw: string): RuleSetToken   // throws, with a message
```

The brand is never constructed anywhere else, so the only route to a `RuleSetToken` is
through the parser. A function taking one does not need to re-check it, and a plain
`string` cannot be passed by mistake — the compiler refuses.

Two entry points, because there are two kinds of caller:

```ts
parseRuleSetToken('QRB---')     // throws — a programming error deserves a loud failure
tryResolveRuleSet(urlParam)     // returns null — untrusted input deserves a fallback
```

`parseAlgebraic` in `src/game/coord.ts` predates this and follows the same shape,
throwing on `"z9"`.

## What it buys

- Impossible states become unrepresentable. There is no "unvalidated token" flowing
  around the system waiting to be checked.
- The error message lives in one place and can afford to be good:

  > `Invalid ruleset token: "QRB---". Expected up to 6 characters, each either "-" or
  > the piece letter for its position (BRQNKP).`

- Validation rules are stated once. That `'QRB---'` is invalid — position is meaningful,
  not merely membership — is asserted in `rules.test.ts` and enforced everywhere by
  construction.

## What it costs

- A small ceremony at the boundary: untrusted strings need a parse step before use.
- Branded types are a TypeScript idiom rather than a language feature, so the brand is
  erased at runtime. It buys compile-time safety only — which is why
  `parseRuleSetToken` still checks at runtime rather than trusting a cast.
- Overusing brands makes a codebase tedious. Reserve them for values that are genuinely
  confusable. Planned next: `Centipawns`, `Depth` and `Ply`, because those three get
  mixed up in every engine ever written.

## Where else it appears

- [Open registry](./open-registry.md) — resolution takes a *parsed* token, so the
  registry never has to consider malformed input.
- [Rules as data](./rules-as-data.md) — a token is how a ruleset is named; the parsed
  form is how it is used.
- [ADR 0004](../../prj-mgmt/epics/engine/adr/0004-ruleset-identity-and-tokens.md) — why
  the token is shaped the way it is.
