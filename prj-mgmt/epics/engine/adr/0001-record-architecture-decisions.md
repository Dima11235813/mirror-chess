# ADR 0001 — Record architecture decisions

**Status:** accepted · **Date:** 2026-07-31

## Context

This project already refuses to write rules code without a written rule
(`../../rules/mirror-portal-spec.md`), because the first build failed precisely by
letting each session invent its own interpretation. Architecture has the same failure
mode: a decision gets made in someone's head, the reasoning is lost, and six months
later nobody can tell a deliberate choice from an accident — so nobody dares change it.

For an engine that is explicitly meant to **teach**, this is worse than usual. The part
readers most want, and that tutorials most consistently omit, is *why*: why alpha-beta
and not MCTS, why this board representation, why the obvious optimisation was rejected.
Code shows what; only a record shows why.

## Decision

Every architectural decision of consequence gets a short ADR in this directory,
numbered sequentially and never rewritten once accepted — superseded, if anything.

**Of consequence** means: hard to reverse, or it constrains later work, or a reasonable
engineer would ask "why on earth is it done that way?".

Format, deliberately short — an ADR nobody writes because it is a chore is worth
nothing:

```
# ADR NNNN — Title
**Status:** proposed | accepted | superseded by NNNN · **Date:** YYYY-MM-DD
## Context      what forced a choice
## Decision     what we chose, in the active voice
## Consequences what it buys, what it costs, what it forecloses
## Alternatives what else was considered and why not — the most useful section
```

`Alternatives` is not optional. A decision with no rejected alternatives was not a
decision, and rejected alternatives are the most instructive part for a reader.

## Consequences

- Design discussions land somewhere durable instead of in a commit message.
- The learning artifact gets its "why" layer for free.
- A small ongoing cost per decision — accepted, since the project already pays the same
  cost for rules and has been repaid for it.
- ADRs can be wrong. They record what was decided and why *at the time*; a superseding
  ADR is the correction, and the original stays as history.

## Alternatives considered

- **Comments in the code.** Good for local "why", useless for decisions spanning
  modules, and they disappear when the code is refactored.
- **The rules spec.** Wrong document: it describes the *game*, and mixing "what the game
  is" with "how we compute it" would blur the boundary this engine is built around.
- **Nothing, rely on the commit log.** How the first build lost its rules.
