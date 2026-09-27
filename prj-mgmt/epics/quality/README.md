# Epic — Quality: security, accessibility and robustness

> Opened 2026-09-27 by a consolidation pass over the whole branch. This epic holds the
> findings that belong to no feature — the ones that are nobody's story until they are
> somebody's incident.

---

## 1. What was reviewed, and what it found

A security pass, an accessibility pass and a self-review of the session's code, run against
the built app rather than read off the source.

**The honest headline: there is very little attack surface, and the accessibility basics
are already right.** That is not luck — it follows from decisions already made. The app is
client-side with no backend, no auth and no network calls; React escapes by default and
nothing uses `dangerouslySetInnerHTML`; and every visual cue was given an `aria-label`
counterpart from the start because CLAUDE.md §7 required it.

| Pass | Result |
| --- | --- |
| Security | **0 findings** rated exploitable. 1 robustness hole at a trust boundary → [`untrusted-save-import.md`](./untrusted-save-import.md) |
| Dependencies | **Production: 0 vulnerabilities.** Dev toolchain: 21 (2 critical) → [`dependency-audit.md`](./dependency-audit.md) |
| Accessibility | 2 real findings, both **MEDIUM** → [`accessibility-pass.md`](./accessibility-pass.md) |
| Code quality | 3 dead exports and 2 undocumented ones, all from this session — **fixed during the pass** |

## 2. The security model, written down

Worth stating plainly, because future work will change it and the change is the risk:

- **No server, no auth, no network.** Nothing is transmitted; everything lives in the
  browser. Most of the classic web vulnerability classes have nowhere to occur.
- **Two trust boundaries exist today:** the URL (`?board=`, `?rules=`, `?puzzle=`, …) and
  **imported save files**. The URL side validates — `tryResolveRuleSet` rejects unknown
  tokens, `fromPiecesSpec` is wrapped in try/catch, numeric params are `Number.isInteger`
  checked. The file side does not; see the story.
- **The puzzle library is trusted input** — it is committed, and re-proved by
  `puzzle-set.test.ts` on every run.
- **What will change the model:** Google authentication and solve telemetry
  ([`../puzzles/solve-logging.md`](../puzzles/solve-logging.md)) introduce a server, an
  identity and PII for the first time. That is when a security pass stops being this short,
  and the unlinkability promise made there becomes a real engineering obligation.

## 3. Why the accessibility findings are small but not trivial

The board is keyboard-operable (squares are real `<button>`s; a full move completes with
Tab and Enter — verified, not assumed), contrast is far above AA in both themes (21:1 for
status text, 6.7:1 for piece glyphs), live regions announce turn, check and verdict, and
nothing overflows at 360px.

What is missing is **structure** and **one announcement**, and the second one matters more
than its severity suggests: the puzzle *reveal* — the route through the seam and the reason
the puzzle is impossible in chess — is the product's whole payoff, and a screen-reader user
currently never hears it.

## 4. Status

| | |
| --- | --- |
| [`accessibility-pass.md`](./accessibility-pass.md) | 📋 2 findings: no headings anywhere, and the puzzle reveal is not announced |
| [`untrusted-save-import.md`](./untrusted-save-import.md) | 📋 an imported save file is cast to `GameState` with no validation |
| [`dependency-audit.md`](./dependency-audit.md) | 📋 dev-only vulnerabilities, and the ESLint gap that lets this class of thing hide |
