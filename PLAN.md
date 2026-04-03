# Implementation Plan: Scoreboard, Points, Custom Topics + Feature Expansion

## Summary

Add scoreboard with persistent scoring, voting UI, custom topics, dramatic reveal, and timed sketch mode (already shipped on this branch). Remaining features: achievements, rematch button, player stats, room passwords. Transform from "solid drawing game" into a sticky party game with replay loops.

---

## CEO REVIEW OUTPUTS

### What already exists (sub-problems to existing code)

| Sub-problem | Existing code | Gap |
|---|---|---|
| Cumulative scoring | `game-room.js: scores`, `calculateScores()` | No per-session/long-term persistence |
| Round results display | `round-result-dialog.vue` | **DONE** -- dramatic staggered CSS animation shipped |
| Dialog system | `currentDialog` pattern in `game-view.vue` | No achievement, stats, settings dialogs |
| Game modes | `gameMode: 'classic' | 'timed'` in `game-room.js` | **DONE** -- timed mode shipped (15s timer, server-side) |
| Session identity | `state.js` localStorage for username | No stats, achievements, cosmetics |
| Rematch flow | `NEXT_ROUND` + `RETURN_TO_SETUP` | Requires clicking "Next Round" manually from result |
| Access control | Room codes only | No passwords for private games |

### Dream State Delta

```
CURRENT (shipped on Upgraded-Version)
  Draws one round. Votes. Sees scores. Custom topics.
  Dramatic reveal with staggered CSS animation. Timed sketch mode (15s).
     |
     V
THIS PLAN (remaining features)
  + Achievements with toasts during gameplay
  + One-click rematch
  + Player stats dashboard on home screen
  + Room passwords for private games
     |
     V
12-MONTH IDEAL
  Multiple game modes (double-faker, blind draw), category packs,
  shareable recap images, spectator mode. Deferred to later.
```

### NOT in scope (deferred items)

| Deferred | Why |
|---|---|
| Confession phase | Adds complexity to voting flow, not blocking retention |
| Double-faker mode | Requires game logic rewrite, too much for current blast radius |
| Shareable recap image | Canvas snapshot nice-to-have, not core to gameplay |
| Category packs | Needs prompt.csv restructuring, content not plumbing |
| Cosmetic unlock system | Requires asset pipeline, deferrable |
| Spectator audience mode | Different product problem, needs infra changes |
| Speed vote timers | Nice but voting already flows well |
| Comeback mechanic | Scoring already has enough asymmetry (2pts vs 1pt) |

### Error & Rescue Registry

| Failure mode | Trigger | Rescue action |
|---|---|---|
| Timed mode canvas bug | 30-sec timer doesn't sync across clients | Fallback to "submit when ready" for that turn, log to console |
| Achievement toast breaks dialog | Multiple achievements trigger simultaneously | Queue them, show one at a time with 3s gap |
| Password-locked room orphaned | Host disconnects, room has password | Room cleanup already handles disconnect in SETUP; PLAY/VOTE continues |
| localStorage full | User has bloated stats/achievements | Catch QuotaExceededError, gracefully skip persistence |

### Failure Modes Registry

| Failure mode | Severity | Mitigation |
|---|---|---|
| Timed mode desync between clients | High | Timer runs server-side, broadcast remaining time with state |
| Rematch with changed player count | Medium | Rematch resets to setup if player count changed |
| Achievement farming (players colluding) | Low | Achievements are cosmetic fun, not competitive advantage |
| Stats reset on browser clear | Low | Acceptable. localStorage is convenience, not data integrity |

---

## Design Decisions

### Scoreboard: Dialog in GameView, NOT separate view
The original plan suggested a new `scoreboard-view.vue` top-level view. Better approach: use the existing `currentDialog` pattern in `game-view.vue`. Scoreboard is ephemeral mid-game content -- doesn't need routing through state.js view enum. This reduces blast radius: no new view enum entry, no index.html change, no app.js registration.

### Game Settings: SKIPPED for now
The readme says "hesitant to add to or enforce game rules." Configurable point values and rounds counter goes against the minimalism ethos. Hard-code the scoring formula -- it's simple and good. Ship it fast, add settings later if requested.

### Custom Topics: Collapsible accordion in SetupView
On iPhone 5 (320x568), setup is already tight. Add topics via a section that toggles open/closed, keeping it compact when collapsed.

### Timed Sketch Mode: Mode flag, not a new game
Add `gameMode: 'classic' | 'timed'` to GameRoom. In timed mode, use a server-side 30-second countdown per turn instead of 2-stroke-per-player. All other logic (voting, scoring) stays identical. Toggle in setup view.

### Achievements: localStorage, not server-tracked
Since there's no database, achievements track in `state.js` localStorage. Server emits achievement events when round conditions are met. Client stores achievement progress. Lost on clear, but that's fine for a party game.

### Dramatic Reveal: CSS animation, no JS overhead
The round-result-dialog already exists. Add a staggered CSS animation that reveals each player's name one-by-one with a "NOT THE FAKER" stamp, then a final reveal. No extra components needed.

---

## Implementation Steps

### Steps 1-7: Original Plan (ALREADY SHIPPED)

Scoreboard, voting, custom topics, dramatic faker reveal, and timed sketch mode are implemented on the `Upgraded-Version` branch already. Kept here for reference only.

### Step 8: Achievements System

**`src/common/message.js`** -- Add:
- `ACHIEVEMENT_UNLOCKED` -- server -> client: { name, icon, description }

**`src/server/game-room.js`** -- Add to `calculateScores()`:
- Check achievement conditions after each round:
  - "First Game" -- complete a round
  - "Sharp Eyes" -- vote for faker correctly 5 times (cumulative)
  - "Master Faker" -- survive as faker 3 times
  - "Frame Job" -- get an innocent player voted out (faker survives + someone wrong got most votes)
  - "Perfect Round" -- all artists voted correctly
  - "Lone Wolf" -- win as faker alone (2-player game)
- On achievement unlock: broadcast `ACHIEVEMENT_UNLOCKED` to all clients

**`src/public/js/state.js`** -- Add:
- `achievements: { [key]: unlocked: boolean, date: number }` stored in localStorage
- Achievement display toast function (small popup at bottom of game-view)
- Socket handler for `ACHIEVEMENT_UNLOCKED`

**`src/public/js/game-view.vue`** -- Add:
- Achievement toast component (small, auto-dismiss, bottom-center)
- Queue multiple achievements, show one at a time with 3s gap

### Step 8 (reference only): Dramatic Faker Reveal -- SHIPPED

Implemented via staggered CSS animations in `round-result-dialog.vue`. Elements use `reveal-element` class with `--delay` CSS variables, keyframe animations (`reveal-slide`, `reveal-row`, `reveal-fade`), a skip button, and auto-complete timer. No further work needed.

### Step 9: Rematch Button

**`src/common/message.js`** -- Add:
- `REQUEST_REMATCH` -- client -> server
- `REMATCH_STARTED` -- server -> client

**`src/server/game-room.js`** -- Add:
- `requestRematch(username)` -- host-only, resets round/turn/keyword/faker/strokes/votes, keeps scores/roundResults, calls `startNewRound()`
- Phase flow: from RESULT → back to SETUP briefly (100ms) → PLAY

**`src/server/socket-handler.js`** -- Add handler:
- `REQUEST_REMATCH(io, sock, data)` -- validates host-only, triggers rematch

**`src/public/js/round-result-dialog.vue`** -- Add:
- "Rematch" button (host only, shown when in VOTE phase)
- When clicked, shows "Waiting for host to start rematch..." for non-host players

**`src/public/js/state.js`** -- Add:
- `submitRematch()` action
- Socket handler for `REMATCH_STARTED`

### Step 10 (reference only): Timed Sketch Mode -- SHIPPED

Fully implemented end-to-end: `gameMode` ('classic'|'timed') in `game-room.js`, `startTimedTurn()` with 15s countdown, `SET_GAME_MODE` + `TURN_TIMER_UPDATE` messages, timer display with urgency states in `game-view.vue`, mode selector in `setup-view.vue`. No further work needed.

### Step 11: Player Stats Dashboard

**`src/public/js/home-view.vue`** -- Add:
- "Stats" section (toggleable, like custom topics accordion)
- Shows: Games played, Faker wins, Artist wins, Best streak, Favorite wins
- Data from localStorage, structured as:
```js
{
  gamesPlayed: number,
  fakerWins: number,      // survived as faker
  artistWins: number,    // caught faker
  bestStreak: number,    // consecutive correct votes
  favoriteKeyword: string // most common winning keyword
}
```

**`src/public/js/state.js`** -- Add:
- Load stats from localStorage on init
- `stats` object on state
- Update stats after each round result (increment counters based on role and outcome)

**`src/public/js/home-menu.vue`** -- Add:
- "Stats" button alongside Create/Join/Rules/FAQ

### Step 12: Room Passwords

**`src/server/lobby.js`** -- Add:
- `createRoom(code, password?)` -- rooms can optionally have a password
- `joinRoom(code, password?)` -- validates password if set, returns error if wrong

**`src/server/game-room.js`** -- Add:
- `password: string | null` on GameRoom

**`src/server/schema.js`** -- Add validation:
- `CREATE_ROOM` -- optional { password: string (0-20 chars) }
- `JOIN_ROOM` -- optional { password: string }

**`src/common/message.js`** -- Add error type:
- `JOIN_ERROR` -- { reason: 'WRONG_PASSWORD' | 'OTHER' } (or extend existing ERROR message)

**`src/server/socket-handler.js`** -- Modify:
- `CREATE_ROOM` handler: accept optional password from data
- `JOIN_ROOM` handler: check password before allowing join

**`src/public/js/home-menu.vue`** -- Add:
- Optional password input on Create Game (toggleable "Add password?")
- If room requires password, show password prompt on join
- Use existing dialog pattern for password entry

**`src/public/js/state.js`** -- Add:
- Password passed with `createRoom` and `joinRoom` actions
- `JOIN_ERROR` handler shows error message

### Step 13: Tests

**`test/test.js`** -- Add:
- Achievement unlock tests (conditions met, multiple achievements, localStorage persistence)
- Rematch tests (host-only, scores preserved, new round starts)
- Password tests (correct password accepted, wrong password rejected, no password still works)
- Stats tests (increments after round, localStorage persistence)
- Timed mode tests (already implemented -- verify timer auto-advances, mode switch)

## Files Modified

### New Files
- (none beyond existing vote-dialog.vue and round-result-dialog.vue)

### Modified Files (Server) -- REMAINING
- `src/server/game-room.js` -- rematch, password, achievement checks
- `src/server/socket-handler.js` -- rematch, password join validation
- `src/server/schema.js` -- password schemas
- `src/server/lobby.js` -- password on room creation

### Modified Files (Client) -- REMAINING
- `src/public/js/game-view.vue` -- achievement toast
- `src/public/js/round-result-dialog.vue` -- rematch button
- `src/public/js/home-view.vue` -- stats dashboard
- `src/public/js/home-menu.vue` -- password UI, stats button
- `src/public/js/state.js` -- achievements, stats, rematch, password actions

### Modified Files (Shared) -- REMAINING
- `src/common/message.js` -- ACHIEVEMENT_UNLOCKED, REQUEST_REMATCH, REMATCH_STARTED, JOIN_ERROR

### Modified Files (Server) -- SHIPPED
- `src/server/game-room.js` -- gameMode, timer (+ already done)
- `src/server/socket-handler.js` -- SET_GAME_MODE handler (+ already done)
- `src/server/schema.js` -- SET_GAME_MODE schema (+ already done)

### Modified Files (Client) -- SHIPPED
- `src/public/js/game-view.vue` -- timer display (+ already done)
- `src/public/js/setup-view.vue` -- game mode selector (+ already done)
- `src/public/js/round-result-dialog.vue` -- dramatic reveal (+ already done)
- `src/public/js/client-game.js` -- gameMode, turnTimeRemaining (+ already done)

### Modified Files (Shared) -- SHIPPED
- `src/common/message.js` -- SET_GAME_MODE, TURN_TIMER_UPDATE (+ already done)

## Data Flow (Expanded)

```
SETUP → [mode: classic|timed] → START_GAME
  → PLAY (drawing turns: 2 strokes OR 30s timer)
  → VOTE (submit votes)
  → ROUND_RESULT (show scores, dramatic reveal, achievement toasts)
  → [HOST: Rematch → PLAY] or [Next Round → PLAY] or [Exit → SETUP]
```

### Achievement Triggers
```
calculateScores() → check conditions → if met, emit ACHIEVEMENT_UNLOCKED
  → client receives → shows toast → saves to localStorage
```

### Timer Flow (Timed Mode)
```
server: startTimedTurn() → 30s countdown
  → every 1s: broadcast TURN_TIMER_UPDATE
  → at 0s: auto-nextTurn() or auto-submit
```

## Constraints
- iPhone 5 compat (320x568)
- In-memory only, no database
- Minimal aesthetic preserved
- Custom topics per-room, not global
- Achievements/stats: localStorage, cleared on browser wipe
- Timed mode: server-authoritative, clients display only

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|-----------|-----------|----------|----------|
| 1 | CEO | Add achievements system | AUTO | P1 completeness | Adds meta-game layer with zero server persistence needed | localStorage-only |
| 2 | CEO | Timed sketch mode as toggle | AUTO | P5 explicit | Single gameMode flag, all logic branches cleanly | Separate game mode class |
| 3 | CEO | Dramatic reveal via CSS only | AUTO | P5 explicit | No animation library needed, simple timeouts | JS animation library |
| 4 | CEO | Achievements in localStorage | AUTO | P4 DRY | Reuses state.js localStorage pattern | Server-side achievement tracking |
| 5 | CEO | Defer double-faker mode | AUTO | P3 pragmatic | Requires game logic rewrite, too large for current work | Implement now |
| 6 | CEO | Defer shareable recap images | AUTO | P2 blast radius | Canvas snapshot adds new file handling infra | Include in scope |
| 7 | CEO | Defer category packs | AUTO | P3 pragmatic | Needs prompt.csv restructuring | Include in scope |
| 8 | CEO | Room passwords optional | AUTO | P5 explicit | Keep create/joom flow simple, password is optional field | Mandatory passwords |
| 9 | CEO | Stats per-player in localStorage | AUTO | P4 DRY | Consistent with achievement storage approach | Server-side stats |
