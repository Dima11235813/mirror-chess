# ADR 0004 — Identify a ruleset by a canonical token, resolved through a registry

**Status:** accepted · **Date:** 2026-08-01

## Context

Every piece's portal is a feature flag, so a position is only meaningful alongside the
rules it was played under. Four consumers need to *name* a permutation, and they have
different needs:

| Consumer | Needs |
| --- | --- |
| Saved games | short, stable, survives the flag set changing later |
| Shareable links | short, legible, no decoder required |
| The variant study | 64 rows that sort and align; somewhere to attach measured metrics |
| A future network protocol | unambiguous, versionable |

Embedding the expanded flag object everywhere fails all four: it is long, it has no
stable identity to compare or index by, and any change to the flag set silently
invalidates stored copies.

## Decision

**A ruleset is identified by a canonical fixed-width token, and a registry maps tokens
to saved definitions.**

The token is one character per flag, in the fixed order `B R Q N K P` — the piece letter
for on, `-` for off:

```
BRQNKP   every piece crosses (today's default)
BRQ---   sliders only (the rules as originally specified in §4)
------   ordinary chess (the study's control)
```

Fixed width so it is never empty, sorts, aligns across 64 rows, and reads without a
decoder. The registry is a **data file**, not code, holding name, aliases, description,
status and — the reason it must be data — the metrics the study attaches to each
permutation over time.

Two rules make this safe:

1. **A syntactically valid token always resolves, registered or not.** An unknown token
   decodes straight from its characters and comes back as `experimental`. The registry
   adds *meaning*, never the *ability to exist*.
2. **Positions are fixed and append-only.** A seventh flag appends a seventh character;
   a six-character token read by a seven-flag build means "position 7 off". Old saves
   and old links keep meaning exactly what they meant.

## Consequences

- One short string identifies a variant everywhere: storage, URL, study output, wire.
- The study gets a natural primary key, and results accumulate against it.
- Sharing an arbitrary permutation needs no registration, which keeps the
  player-proposed-rules goal open.
- Adding a flag is a non-breaking change, by construction.
- **The registry becomes a compatibility surface**: once a token is published, its
  meaning is frozen. Changing what a position *means* requires a schema bump and a
  prefixed token (`2:BRQ---`), which we should work hard to never need.
- Slight redundancy — the token encodes the flags *and* the registry stores them — so
  the round-trip `tokenOf(rulesOf(token)) === token` must be tested over all 64, or the
  two representations can drift.

## Alternatives considered

- **Opaque sequential IDs (`v1`, `v2`).** Decoupled from the flags, so unregistered
  permutations cannot exist or be shared — fails the study and the north-star goal.
- **Expanded flags inline in URLs and saves.** Verbose, no stable identity, and every
  stored copy breaks when the flag set grows.
- **Bitmask hex (`3F`, `07`, `00`).** Shortest, sorts, forward-compatible — but opaque:
  `?rules=07` tells a reader nothing, and the study's 64 rows become unreadable. The
  compactness is not worth it at this size.
- **Names only (`sliders`, `full`).** Delightful for the handful we care about;
  cannot express all 64, so the study would need a parallel scheme.
- **Hash of the rules object.** Stable and collision-free, but unreadable and it changes
  when the object's shape changes — the opposite of the forward compatibility wanted.
