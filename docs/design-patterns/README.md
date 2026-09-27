# Design patterns in Mirror Chess

The engine is meant to be **read**, not just run (CLAUDE.md §12). These notes name the
patterns the codebase leans on, point at the real code that uses them, and — the part
usually missing — say what each one *costs*.

Every note follows the same shape: **the problem**, **how it looks here**, **what it
buys**, **what it costs**, and **where else it appears**.

| Pattern | One line | Mostly seen in |
| --- | --- | --- |
| [Functional core, imperative shell](./functional-core-imperative-shell.md) | All rules are pure functions; effects live at the edges | `src/game/*` vs `src/App.tsx` |
| [Parse, don't validate](./parse-dont-validate.md) | Check once at the boundary, then carry a type that cannot be wrong | `RuleSetToken`, `parseAlgebraic` |
| [Cohesive parameter object](./cohesive-parameter-object.md) | Data used together travels together, instead of threading parameters | `Position`, `GameState` |
| [Rules as data, not branches](./rules-as-data.md) | Configuration is looked up, never scattered as `if` statements | `RuleSet`, `portalEnabled` |
| [Open registry](./open-registry.md) | A catalogue adds meaning, never the right to exist | `ruleset-registry.ts` |
| [Oracle testing](./oracle-testing.md) | Verify against an authority outside the project | `perft.test.ts` |

## Why these, and why written down

Two of the project's goals make patterns load-bearing rather than decorative:

- **The rules are configurable.** One engine plays 64 games, so "what the game is" and
  "how we compute it" have to stay genuinely separate. That single requirement drives
  [rules as data](./rules-as-data.md), the [open registry](./open-registry.md), and the
  [parameter object](./cohesive-parameter-object.md).
- **The engine is a teaching artifact.** A reader should be able to follow it, which
  rules out the usual engine habit of trading clarity for nodes per second everywhere.
  Where we do trade, it is confined and labelled — see
  [ADR 0002](../../prj-mgmt/epics/engine/adr/0002-two-implementations-one-oracle.md).

## Related decisions

Patterns describe *how the code is shaped*. Architecture Decision Records describe
*why we chose that shape*, including what we rejected:

- [ADR 0001 — Record architecture decisions](../../prj-mgmt/epics/engine/adr/0001-record-architecture-decisions.md)
- [ADR 0002 — Two implementations, one oracle](../../prj-mgmt/epics/engine/adr/0002-two-implementations-one-oracle.md)
- [ADR 0003 — Compile the rules into tables, not into branches](../../prj-mgmt/epics/engine/adr/0003-rule-configuration-in-the-hot-path.md)
- [ADR 0004 — Ruleset identity and tokens](../../prj-mgmt/epics/engine/adr/0004-ruleset-identity-and-tokens.md)

## A note on SOLID here

The codebase is functional rather than object-oriented, so the SOLID principles show up
in a different dress:

| Principle | How it appears |
| --- | --- |
| Single responsibility | One module per concept: `rays` is geometry, `attacks` is threat, `moves` is legality, `status` is outcome. |
| Open/closed | New rulesets need no code change — see [Open registry](./open-registry.md). |
| Liskov substitution | `GameState` is usable anywhere a `Position` is, with no adapter — see [Cohesive parameter object](./cohesive-parameter-object.md). |
| Interface segregation | Functions take the narrowest type that works: `findKing` wants a `Board`, `attacksFrom` needs a whole `Position`. |
| Dependency inversion | The core depends on the `RuleSet` *value* it is handed, never on a global or an import of a specific ruleset. |
