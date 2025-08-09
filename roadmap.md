# Mirror Chess Roadmap

Ionic + React + TypeScript + Vite + Vitest, FP-leaning game core, SOLID-ish boundaries, and unit tests for the mirror rule. You can install and run it locally with:

## Local Development
```
pnpm i   # or npm/yarn
pnpm dev
pnpm test
```

# Rules TODO

1. Mirror scope: should mirroring be **only horizontal to the exact mirrored square** (current v0.1), or do you want wrap-style movement for sliders (e.g., rook sliding past the left edge reappears on the right and continues)?
2. Piece coverage: do **all** pieces get a mirror option (with the knight exception to blocking), or should some be excluded (e.g., pawns/king)?
3. Pawns: if included, should mirror moves respect direction (same rank only), and can a pawn **capture** via a mirror move?
4. Checks: okay to keep v0.1 “pseudo-legal” (no check validation, castling, en passant) and then add full legality + special moves next?
5. Platform: Ionic is set up; do you want me to add Capacitor targets (Android/iOS) scaffolding now, or keep it web-first until rules settle?

## Project Mgmt TODO

* Add full check/checkmate detection and pins,
* Implement captures/turn log + simple undo,
* Add a test matrix that covers all input variants per your “each variance has a test” rule,
* Wire up Capacitor for mobile builds.
