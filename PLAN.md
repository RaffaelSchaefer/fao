# Migration Status

## What shipped

The repo has already been migrated to the new stack:

- Vue 3 + TypeScript
- Vite+
- Express + Socket.IO 4
- Node 22+
- Vitest for server contract tests
- Playwright for browser coverage

The old webpack/Vue 2/Babel toolchain is gone from the build path. `src/` is now TypeScript/Vue-first, with no standalone `.js` source files left under the app tree.

## Completed Work

- Converted the client shell and game views to Vue 3 single-file components with TypeScript scripts.
- Upgraded the server entrypoint and realtime flow to ESM/NodeNext.
- Tightened the TypeScript config so the app no longer allows JS source files under `src/common` or `src/public`.
- Updated the docs in `CLAUDE.md` and `readme.md` to match the shipped commands and folder layout.
- Added browser coverage for:
  - mobile layout
  - setup/game phase transitions
  - reconnect after a forced disconnect

## Current Verification

- `npm run check` passes
- `npm run build` passes
- `npm test` passes

## Remaining Cleanup

- Keep trimming the Tailwind-based CSS layer as the last SCSS-free cleanup pass
- Decide whether to rename `readme.md` to `README.md` for consistency
- Consider adding one more browser spec for mid-game stroke submission if realtime regressions start reappearing

## Historical Notes

The older feature roadmap in this file has been superseded by the migration work that already shipped. Keep this file as a short status note rather than a future-facing implementation plan.
