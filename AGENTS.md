# AGENTS.md

This file provides guidance to Codex when working in this repository.

## Project Overview

**Fake Artist Online** is a multiplayer party game based on _A Fake Artist Goes to New York_.
The current stack is:

- **Vue 3** with TypeScript, Tailwind CSS, and Vite+
- **Express** + **Socket.IO 4**
- **Node 22+**
- **Vitest** for server/unit tests
- **Playwright** for browser coverage

The app is still in-memory. There is no database.

## Essential Commands

```bash
# Install dependencies
npm install

# Start the full local stack: Express server + Vite+ dev server
npm run dev

# Type-check the app and shared code
npm run check

# Type-check the server build output
npm run build:server

# Build the production bundle
npm run build

# Run all tests
npm test

# Run browser tests only
npm run test:e2e

# Start the production server
npm run start
```

## Layout

```text
src/
├── common/          # Shared game models, enums, helpers
├── public/
│   ├── js/          # Vue SFCs, client state, drawing helpers
│   ├── static/      # Static assets served as-is
│   └── style/       # Global styles and Tailwind-driven CSS
└── server/          # Express, Socket.IO, lobby, game-room, schema
test/
├── e2e/             # Playwright browser tests
└── server/          # Vitest server contract tests
```

## Architecture Notes

- `src/server/server.ts` is the server entry point. It serves the built client and wires Socket.IO.
- `src/server/socket-handler.ts` validates incoming messages and owns realtime event flow.
- `src/server/game-room.ts` contains the room state machine, phase transitions, and broadcast logic.
- `src/public/js/state.ts` is the client store. It owns socket wiring, reconnection, and action methods.
- `src/public/js/game-view.vue` is the main gameplay UI and canvas interaction layer.
- `src/public/js/drawing-pad.ts` manages the dual-canvas drawing surface.
- Shared types live in `src/common/` and should stay framework-agnostic.

## Working Rules

- Prefer TypeScript for new code.
- Keep game state server-authoritative.
- Do not add REST endpoints unless the feature really needs them.
- Preserve the mobile-first layout. The app should still work on narrow screens.
- When changing realtime behavior, add or update a Vitest contract test and a browser test.
