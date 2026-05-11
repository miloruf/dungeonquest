# DungeonQuest — Project Handoff

This file is kept up to date after every change session. If you are picking up this project in a new conversation (Cursor, Claude Code, etc.), read this file first — it contains everything you need to continue without re-reading the full codebase.

---

## What is this project?

A D&D-inspired mobile game built with **React Native + Expo** for the UEK 335 school module (Mobile Apps entwickeln). Players explore dungeons, fight enemies, find loot, and level up their characters.

**Tech stack:**
- React Native + Expo SDK 54 + TypeScript (strict)
- Expo Router v6 (file-based navigation)
- Supabase JS SDK (real-time multiplayer, not yet integrated into game screens)
- React Context for global game state
- No real Claude API yet — mock Dungeon Master

---

## Current Status

### ✅ Done
- **Solo flow** fully playable: `solo.tsx` → `game.tsx` → `result.tsx`
- **5 UI components**: HPBar, ClassSelector, DiceRoller, StoryBox, ChoiceButtons
- **Mock Dungeon Master** with situation/outcome split (see Architecture section)
- **Difficulty system**: Easy (Need 7+, 8 turns), Medium (Need 10+, 12 turns), Hard (Need 14+, 15 turns)
- **Class system**: Warrior/Mage/Healer each get roll modifiers on relevant action types
- **Item system**: Dynamically generated (prefix + noun + effect + power), 6 effect types
- **Roll bonus items**: stack and apply to effective dice roll
- **Action-based required rolls**: each choice has a type (combat/tactical/social/risky/recovery) with its own base difficulty
- **Situation/outcome split**: DM first describes what you encounter, THEN you pick how to respond, THEN you roll
- **Previous action biases next encounter**: resting → quiet rooms, fighting → more combat
- **Recovery actions heal HP**
- **Supabase**: client, room service, SQL schema — wired up but multiplayer screens not implemented

### ✅ Done (continued)
- **Multiplayer flow**: `room.tsx` → `lobby.tsx` → `game.tsx` fully wired
- **room.tsx**: Create (name + class + difficulty → Supabase) or Join (name + class + room code) tabs
- **lobby.tsx**: Supabase Realtime player list, host Start button, auto-navigates to /game when status='playing'
- **game.tsx multiplayer**: Supabase subscription, `isMyTurn` check, turn indicator, state sync after each action, "Warte auf..." for non-turn players

### 🔲 Not Done
- Real Claude API integration (mock DM used throughout)
- Roguelike mode (planned, see below)
- Dungeon Crawler spatial exploration system (planned, see below)

---

## Architecture

```
app/
  _layout.tsx        Root Stack navigator, wraps everything in GameProvider
  index.tsx          Home screen — Solo Adventure / Multiplayer buttons
  solo.tsx           Hero creation: name, class, difficulty → initialises GameState
  game.tsx           Main game loop (see Game Loop section)
  result.tsx         Win/loss screen with stats + inventory
  room.tsx           STUB — create/join room by code
  lobby.tsx          STUB — waiting room with Supabase Realtime

components/
  HPBar.tsx          Colour-coded health bar (green >50%, yellow >25%, red ≤25%)
  ClassSelector.tsx  3-card class picker, exports CLASS_HP constant
  DiceRoller.tsx     Animated d20, shows Need X+, bonus line, success/fail label
  StoryBox.tsx       Scrollable DM narrative chat, auto-scrolls to bottom
  ChoiceButtons.tsx  Numbered action buttons with Need X+ per button

services/
  mockDungeonMaster.ts   Active DM — see Game Loop section
  dungeonMaster.ts       Real Claude API (unused, for future)
  supabase.ts            Supabase client (reads from .env)
  roomService.ts         createRoom, joinRoom, subscribeToRoom etc.

context/
  gameContext.tsx    GameState, useGame(), addItem(), updatePlayerHP(),
                     setDiceResult(), addStoryMessage(), setGameState()

types/index.ts       All shared interfaces — Item, Player, GameRoom, Message,
                     ChoiceType, Choice, DungeonEvent, Situation, GameState
```

---

## Game Loop (how game.tsx works)

Each turn has 3 phases:

```
'choose'     → Situation description already in StoryBox
               ChoiceButtons shown with Need X+ per action

'roll'       → Player picked action (stored as pendingChoice)
               DiceRoller active, shows required roll + bonus

'processing' → Roll processed, outcome generated
               After 1200ms: next situation generated → back to 'choose'
```

Key functions in `mockDungeonMaster.ts`:
- `generateSituation(difficulty, prevChoiceType)` — picks event type (biased by previous action), picks description from SITUATION_STORIES, returns choice list
- `generateOutcome(choiceType, eventType, effectiveRoll, requiredRoll, difficulty)` — generates outcome story, calculates damage/heal/loot based on success margin

**Roll mechanics:**
- Player sees `Need X+` on each choice button (adjusted for class + items)
- Player selects choice → fresh DiceRoller appears
- Raw roll + rollBonus items = effectiveRoll
- effectiveRoll vs requiredRoll → margin determines outcome tier (fumble/fail/success/great)

**Class modifiers** (applied to choice's baseRequired):
| Class   | Modifier |
|---------|----------|
| Warrior | combat −3, risky −1 |
| Mage    | social −2, tactical −1 |
| Healer  | recovery −3, tactical −1 |

**Item effects on required rolls:**
- `attackBoost` → −power for combat/risky choices
- `armorBoost` → −power for tactical choices
- `healBoost` → −power for recovery choices
- `rollBonus` → +power added directly to dice roll

---

## Planned Features (do NOT implement without user confirmation)

### Multiplayer (next immediate priority)
- `room.tsx`: Generate 6-char room code (create) or enter code (join)
- `lobby.tsx`: Show connected players via Supabase Realtime subscription, class selection per player, host starts game
- Game screen needs to handle multiple players and turn order

### Roguelike Mode
- Persistent character (name, class, inventory) across multiple dungeon runs
- Permadeath: character deleted on death
- Loot extraction mechanic: choose what to keep before dungeon ends
- Between-dungeon merchant screen
- Graveyard screen showing dead characters
- Level system: XP per turn survived, permanent stat bonuses on level-up
- Cursed items: powerful but with negative side effects
- Item sets: 3 matching items = set bonus

### Dungeon Crawler Spatial Exploration (applies to both modes)
- DM describes rooms spatially: corridors, chambers, forks, dead ends
- Choices become navigation: "Take left path", "Enter the cave", "Go straight"
- GameState gets `currentRoom: { type, description, exits: Exit[] }` field
- Exits have `{ direction, hint, requiredRoll? }`
- On Hard mode: fewer hints about what lies ahead
- This is when the real Claude API should be integrated — hardcoded spatial descriptions don't scale

### Claude API Integration (do with Dungeon Crawler)
- `services/dungeonMaster.ts` already has the skeleton
- Model: `claude-sonnet-4-6` (or latest available)
- Replace `generateSituation` + `generateOutcome` with a single Claude call
- System prompt enforces JSON output matching `DungeonEvent` schema
- Add API key to `.env` as `EXPO_PUBLIC_CLAUDE_API_KEY` (or use server-side proxy)

---

## Environment & Keys

```
.env (gitignored — never commit)
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...

.env.example (committed — safe template)
```

Supabase project ref: `powkwdwykfqljdfhfkca`
Supabase rooms table: see `docs/schema.sql`

---

## Dev Commands

```bash
npx expo start          # Start dev server (scan QR with Expo Go)
npx expo start --web    # Open in browser at localhost:8081
npx tsc --noEmit        # Type-check (must pass before committing)
git push                # Push to github.com/miloruf/dungeonquest
```

---

## Change Log

| Date       | What changed |
|------------|-------------|
| 2026-05-11 | Initial solo flow: solo.tsx, game.tsx, result.tsx — basic game loop working |
| 2026-05-11 | 5 UI components built: HPBar, ClassSelector, DiceRoller, StoryBox, ChoiceButtons |
| 2026-05-11 | Supabase setup: client, room service, SQL schema |
| 2026-05-11 | Difficulty system: Easy/Medium/Hard with different turn counts and required rolls |
| 2026-05-11 | Dynamic item generation (procedural prefix+noun+effect+power) |
| 2026-05-11 | Class + item modifiers on required rolls per choice type |
| 2026-05-11 | Flow changed: choose action → roll → see result (was: roll → choose → result) |
| 2026-05-11 | DiceRoller: shows Need X+, success/fail label, item bonus line |
| 2026-05-11 | Recovery actions now heal HP |
| 2026-05-11 | **Situation/outcome split**: DM pre-generates encounter, choices respond to it, outcome reflects action — actions now have real consequences |
| 2026-05-11 | Previous action type biases next encounter distribution |
| 2026-05-11 | Git commit dd21162 pushed to main |
| 2026-05-11 | Treasure encounters now announce item found in DM story; back buttons use router.replace('/') |
| 2026-05-11 | Multiplayer: room.tsx + lobby.tsx fully built; game.tsx extended with Supabase Realtime sync + turn system |
