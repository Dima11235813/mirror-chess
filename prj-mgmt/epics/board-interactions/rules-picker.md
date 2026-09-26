# Story — Choose the rules, play the engine, see what it thought

> **Status: NEXT — the owner's validation surface (2026-09-22).** Part of the
> [board-interactions epic](../board-interactions). Depends on
> [`../engine/strength-and-time.md`](../engine/strength-and-time.md) for the engine being
> worth judging, and on
> [`history/move-log.md`](./history/move-log.md) for the record of what happened.

## Summary

As the owner, I want to pick a rule permutation in the app, choose how long the engine
thinks, and play it — so that I can judge for myself whether it plays good moves, under the
exact rules I want to test.

## 1. Today the rules are a URL parameter

`App.tsx` reads them from `?rules=` and falls back to the default. There is no picker, so
choosing a permutation means hand-editing a query string — and the 64 standard tokens are
not discoverable from the UI at all.

## 2. What the screen gains

**A rules picker.** Six toggles — bishop, rook, queen, knight, king crossing; pawn
capturing across — because after spec §2.1 that is the whole standard space
([`../rules/adjacent-kings.md`](../rules/adjacent-kings.md)). Alongside them, the named
presets that already exist: *ordinary chess* (all off), *sliders only*, *everything
crosses*. The resulting token is shown and is copyable, so a position worth discussing can
be shared as a link.

Changing the rules **starts a new game**, with a confirmation if one is in progress — a
ruleset is not a display setting, it is which game is being played.

**A think-time control.** Seconds per move, not an opaque "difficulty": the levels differ
only in how long they think, so the UI should say so. The existing three presets stay as
shortcuts.

**The engine's own view**, while and after it thinks: depth reached, score in pawns from
the side to move, nodes, and the **principal variation** in the new notation. This is what
turns "it played something odd" into a reproducible report.

## 3. What this is for

It is the owner's instrument, so it is judged by whether a session produces a usable
verdict — not by how polished it looks. Two failure modes to design against:

- **A verdict that cannot be reduced.** If a bad move cannot be turned into a position, a
  ruleset and a depth, the session produced an impression rather than a bug.
- **A ruleset that is not what was played.** The token shown must be the token the engine
  received; the game record carries it too
  ([`history/move-log.md`](./history/move-log.md)).

## 4. Acceptance Criteria

- [ ] Six toggles set any of the **64 standard rulesets**; non-standard tokens arriving by
      URL still load, and are labelled **experimental** rather than rejected.
- [ ] The current token is displayed and copyable, and a copied link reproduces the game's
      rules exactly.
- [ ] Changing the rules starts a new game, confirming first if one is in progress.
- [ ] Think time is settable, and the engine demonstrably uses it — a longer setting
      reaches a greater depth on the same position.
- [ ] Depth, score, nodes and the PV are visible during and after the engine's turn.
- [ ] Everything is keyboard reachable and screen-reader labelled; the PV and score have
      text equivalents, not colour or position alone.
- [ ] Works in light and dark themes, and at phone width.
- [ ] An e2e test sets a permutation, plays a move, and asserts the engine replies under
      those rules — colocated here as `rules-picker.e2e.ts`.

## 5. Test plan

| Tier | File | Covers |
| --- | --- | --- |
| Integration | `src/components/RulesPicker.spec.tsx` | toggles map to tokens; presets; experimental labelling |
| Integration | `src/components/EnginePanel.spec.tsx` | depth/score/nodes/PV render; live region announces the move |
| E2E | `prj-mgmt/epics/board-interactions/rules-picker.e2e.ts` | pick rules → play → engine replies under them |

## Definition of done

The owner can open the app, choose any of the 64 rulesets, set a think time, play a game,
and come away with either a judgement or a bug report that names a position, a ruleset and
a depth.
