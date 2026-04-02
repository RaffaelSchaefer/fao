# Implementation Plan: Scoreboard, Points & Custom Topics

## Summary

Add scoreboard with persistent scoring, a voting UI (already planned — vote-dialog was commented in game-view.vue line 37 but removed), and custom topics for rooms. Transform the game from casual into a competitive Jackbox-style party game.

## Design Decisions

### Scoreboard: Dialog in GameView, NOT separate view
The original plan suggested a new `scoreboard-view.vue` top-level view. Better approach: use the existing `currentDialog` pattern in `game-view.vue`. Scoreboard is ephemeral mid-game content — doesn't need routing through state.js view enum. This reduces blast radius: no new view enum entry, no index.html change, no app.js registration.

### Game Settings: SKIPPED for now
The readme says "hesitant to add to or enforce game rules." Configurable point values and rounds counter goes against the minimalism ethos. Hard-code the scoring formula — it's simple and good. Ship it fast, add settings later if requested.

### Custom Topics: Collapsible accordion in SetupView
On iPhone 5 (320x568), setup is already tight. Add topics via a section that toggles open/closed, keeping it compact when collapsed.

## Implementation Steps

### Step 1: Scoring + Round Results (Server)

**`src/server/game-room.js`** — Add to GameRoom class:
- `scores: { [playerName: string]: number }` — cumulative scores
- `votes: { [playerName: string]: string }` — per-round votes (target player name)
- `roundResults: Array<{ round: number, fakerName: string, votes: ..., fakerCaught: boolean, pointsAwarded: { [name]: number } }>`
- New method `calculateScores()` — tallies votes, awards points, records round result
- Modify `startNewRound()` — resets `votes` each round, doesn't reset `scores` or `roundResults`
- Modify `invokeSetup()` — resets `scores` and `roundResults` too

**`src/server/socket-handler.js`** — New handlers:
- `SUBMIT_VOTE(io, sock, data)` — validates vote (only during VOTE phase, one vote per player), adds to room.votes, when all players voted → calculate scores
- `NEXT_ROUND` — calls `broadcastRoomState` with RESULT_DIALOG type before calling `startNewRound()`

**`src/common/message.js`** — Add:
- `SUBMIT_VOTE`
- `VOTE_RESULT`
- `ROUND_RESULT`
- `ADD_CUSTOM_TOPIC`
- `REMOVE_CUSTOM_TOPIC`
- `TOGGLE_CUSTOM_TOPICS`

### Step 2: Voting UI (Client)

Uncomment and build the vote-dialog in game-view.vue.

**`src/public/js/vote-dialog.vue`** — New component:
- List of all players as clickable buttons
- Each button shows player name colored by their assigned color
- Submit button after selecting target
- Disabled after submitting (shows "Voted!")
- During VOTE phase, show this dialog via `currentDialog`

**`src/public/js/game-view.vue`** — Changes:
- Uncomment the `<vote-dialog>` import and registration
- Uncomment the `<vote-dialog v-show="currentDialog === 'VOTE'">` template line
- In VOTE phase, auto-show vote dialog: `watch ['gameState.phase']()` → if VOTE phase and no votes yet → open dialog
- During VOTE phase, hide the canvas (no drawing needed)

### Step 3: Round Result Dialog (Client)

**`src/public/js/round-result-dialog.vue`** — New component:
- Faker reveal: "The faker was: [name]" with animation
- Vote breakdown: table of who voted for whom
- Points awarded this round per player
- Updated total scoreboard
- "Next Round" button (or "Back to Setup" if final round based on round count)

**`src/public/js/game-view.vue`** — Changes:
- Add `ROUND_RESULT` to Dialogs constant
- Add `<round-result-dialog v-show="currentDialog === 'ROUND_RESULT'" ...>`
- After broadcast of VOTE_RESULT, auto-show this dialog

### Step 4: Custom Topics (Server + Client)

**`src/server/game-room.js`** — Add to GameRoom:
- `customTopics: []` — array of `{ keyword, hint }`
- `useCustomTopicsOnly: false`

**`src/server/socket-handler.js`** — New handlers:
- `ADD_CUSTOM_TOPIC(io, sock, data)` — host-only, validates keyword/hint, adds to room.customTopics
- `REMOVE_CUSTOM_TOPIC(io, sock, data)` — host-only
- `TOGGLE_CUSTOM_TOPICS(io, sock, data)` — host-only

**`src/server/schema.js`** — Add schemas for:
- `ADD_CUSTOM_TOPIC` — requires { keyword: string (1-30), hint: string (1-50) }
- `REMOVE_CUSTOM_TOPIC` — requires { index: number }
- `TOGGLE_CUSTOM_TOPICS` — requires { customOnly: boolean }

**`src/server/game-room.js`** — Modify `startNewRound()`:
```js
let pool = this.useCustomTopicsOnly ? this.customTopics : [...allPrompts, ...this.customTopics];
let prompt = Util.randomItemFrom(pool);
```

**`src/public/js/setup-view.vue`** — Add:
- Collapsible "Custom Topics" section with:
  - Input fields for keyword + hint
  - "Add" button
  - List of added topics with delete (x) buttons
  - Toggle: "Include all topics | Custom topics only"
  - Topic count badge
- Uses `.stripe` layout pattern for mobile compat

**`src/public/js/state.js`** — Add:
- `submitAddCustomTopic(keyword, hint)` action
- `submitRemoveCustomTopic(index)` action
- `submitToggleCustomOnly(customOnly)` action
- Socket handlers for the result messages

### Step 5: Tests

**`test/test.js`** — Add:
- Score calculation tests (faker caught, faker survives, tie, edge cases with 2 players)
- Custom topics tests (add, remove, toggle, custom-only mode, game uses custom topic)
- Vote submission tests (normal vote, re-vote disallowed, voting out of phase)

## Files Modified

### New Files
- `src/public/js/vote-dialog.vue` — Voting UI
- `src/public/js/round-result-dialog.vue` — Round end display

### Modified Files (Server)
- `src/server/game-room.js` — scores, votes, roundResults, customTopics, calculateScores()
- `src/server/socket-handler.js` — SUBMIT_VOTE, ADD_CUSTOM_TOPIC, REMOVE_CUSTOM_TOPIC, TOGGLE_CUSTOM_TOPICS handlers
- `src/server/schema.js` — validation schemas for new message types

### Modified Files (Client)
- `src/public/js/game-view.vue` — uncomment vote-dialog, add vote/round-result dialogs wiring
- `src/public/js/state.js` — vote/actions, custom topics actions
- `src/public/js/setup-view.vue` — custom topics UI
- `src/public/js/app.js` — register new components

### Modified Files (Shared)
- `src/common/message.js` — new message constants
- `src/common/game-phase.js` — no changes needed (VOTE phase already exists)

## Data Flow

```
SETUP → START_GAME → PLAY (drawing turns) → VOTE (submit votes)
 → ROUND_RESULT (show scores, reveal faker) → SETUP or PLAY (next round)
```

Scoring:
- Faker caught: artists who voted right get +1, faker gets 0
- Faker survives: faker gets +2, artists who guessed the faker get 0, others +1
- No VOTE phase extension — VOTE phase → server collects votes → broadcasts result → auto-shows round-result dialog

## Constraints
- iPhone 5 compat (320x568)
- In-memory only, no database
- Minimal aesthetic preserved
- Custom topics per-room, not global
