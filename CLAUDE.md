# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Fake Artist Online** — a multiplayer party game based on "A Fake Artist Goes to New York" by Oink Games. One player is secretly the faker who doesn't know the keyword and must blend in by drawing. After two rounds, players vote on who the faker is.

Tech stack: **Vue.js 2** (Options API) + **Express** + **Socket.IO** + **Webpack 4** + **Babel 7**. No TypeScript. All in-memory, no database.

## Essential Commands

```bash
# Install dependencies
npm install

# Build frontend (webpack)
npm run build-p

# Build frontend in watch mode (dev)
npm run watch-p

# Build server (Babel transpile)
npm run build-s

# Build everything
npm run build

# Run the server (requires build first)
npm run start

# Run tests
npm run test

# Clean build artifacts
npm run clean
```

There is no dedicated lint script, but ESLint + Prettier are configured (`.eslintrc`, `.prettierrc`). Code style: 4-space tabs, single quotes, 100-col width.

## Architecture

### High-Level Structure

```
src/
├── common/          # Shared: Message types, Stroke, User, RelativePoint, utils
├── public/          # Frontend: Vue components, state store, drawing canvas, styles
└── server/          # Backend: Express+Socket.IO server, game logic, lobby
test/                # Mocha+Chai integration tests
```

### Server (Node.js + Socket.IO)

- **`src/server/server.js`** — Express + Socket.IO entry point. Serves static files from `dist/public`, loads prompts from CSV.
- **`src/server/socket-handler.js`** — Registers all socket event handlers. Incoming messages validated against JSON schemas (`schema.js` using AJV).
- **`src/server/lobby.js`** — In-memory room management (Map of room codes → GameRoom, max 100 rooms).
- **`src/server/game-room.js`** — Core game logic: rounds, turns, phases (SETUP/PLAY/VOTE), faker assignment, keyword/hint selection, vote counting. `ClientAdapter` generates per-user state views (faker sees `???` keyword).
- **`src/server/prompts/prompts.csv`** — Drawing keyword prompts.

### Client (Vue.js 2)

- **`src/public/js/index.js`** — Webpack entry point. Imports HTML, styles, and app.
- **`src/public/js/app.js`** — Vue root instance. Components: HomeView, RulesView, FaqView, SetupView, GameView.
- **`src/public/js/state.js`** — Centralized state store (plain object, not Vuex). Contains socket event handlers, action functions that emit socket messages, and auto-reconnection logic.
- **`src/public/js/drawing-pad.js`** — Two-layer canvas drawing (old strokes on bottom layer, new stroke on top layer). Uses `RelativePoint` (normalized 0-1) for resolution independence.
- **`src/public/js/view.js`** — VIEW enum: home, setup, game, rules, faq. Manual routing, no vue-router.

### Shared (`src/common/`)

- `message.js` — Socket message type constants (CREATE_ROOM, JOIN_ROOM, SUBMIT_STROKE, etc.)
- `game-phase.js` — Phase enum: SETUP, PLAY, VOTE
- `stroke.js` / `relative-point.js` — Drawing data classes
- `user.js` — User class (socket, name, gameRoom)
- `util.js` — Helpers: shuffle, validateUsername

## Key Patterns

- **All real-time communication via Socket.IO.** No REST API endpoints (except static file serving).
- **State management** is a plain object pattern in `state.js`, not Vuex. Actions emit socket events; mutations come from incoming socket messages.
- **Game state lives server-side** in `GameRoom` instances. Clients send intent (draw stroke, vote), server validates and broadcasts result.
- **No database** — all state is in-memory. Room codes are auto-generated short strings.
- **Drawing uses normalized coordinates** (`RelativePoint`) so strokes render consistently across different screen sizes.

## Contributing Guidelines (from readme.md)

- UI must accommodate iPhone 5 screens (320x568).
- Minimalistic by design. Hesitant to add to or enforce game rules (keeps minimalism, accommodates house rules).
- Not seeking additional keyword prompts.
