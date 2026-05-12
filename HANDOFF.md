# DungeonQuest — Project Handoff

This file is kept up to date after every session. Read this first in any new conversation — it contains everything needed to continue without re-reading the full codebase.

---

## What is this project?

A D&D-inspired mobile game built with **React Native + Expo** for the UEK 335 school module (Mobile Apps entwickeln). Players explore dungeons, fight enemies, find loot, and level up class skills.

**Tech stack:**
- React Native + Expo SDK 54 + TypeScript (strict)
- Expo Router v5 (file-based navigation)
- Vercel AI SDK v6 (`ai`, `@ai-sdk/openai`) — streaming + generation
- Vercel AI Gateway → `google/gemini-3-flash` as the AI Dungeon Master
- Supabase JS SDK (real-time multiplayer)
- React Context for global game state

---

## Engineering Rules (always apply these)

1. **Dead-code check:** After writing or changing code, verify it is actually called/imported. Delete it if nothing uses it.
2. **Full data-flow diagnosis:** When debugging, follow the complete path from trigger → service → state → render. Never stop at a surface symptom.
3. **Root-cause-first:** Identify the exact root cause in the code before writing any fix.

---

## Current Status

### ✅ Fully implemented
- Solo flow: `solo.tsx` → `game.tsx` → `result.tsx`
- Multiplayer flow: `room.tsx` → `lobby.tsx` → `game.tsx` (Supabase Realtime, turn system)
- **Real AI Dungeon Master** via Vercel AI Gateway (streaming, STORY:/JSON: format)
- Mock DM fallback (`mockDungeonMaster.ts`) when no API key
- Difficulty system: easy / medium / hard
- Class system: warrior / mage / healer with stat + roll modifiers
- Item system: procedurally generated, 8 effect types, sell/buy/use
- Gold system: earned from combat/treasure, spent at merchants
- Merchant events: buy/sell items mid-dungeon
- Status effects: poison, burning, paralysis, blessed, strengthened — tick per turn, expire, show in EffectsBar
- Environmental damage: lava/poison gas/ice deals per-turn damage
- Class skills as 4th action option (mana cost, levels up on use, max level 3)
- Mana system: skills cost mana, manaRestore items refill it
- Skill items (learnSkill): scrolls that teach new skills when used
- Natural story ending: DM can set `questComplete: true` to end the game
- Chaos events: 1% chance on normal rolls, 50% on fumble — surreal bonus story
- Game UI refactored into small components (see Architecture)

### 🔲 Planned (do NOT implement without user confirmation)
| # | Feature |
|---|---------|
| 6 | Extended skill system: larger AI-generated skill pool, Soulstones as boss drops |
| 7 | Rest system: Short Rest / Long Rest mechanic |
| 8 | Roguelike mode: persistent character, permadeath, loot extraction |
| 9 | 3D D20 dice with Three.js |
| 10 | Tabletop view for the adventure |
| 12 | AI companions |
| 13 | Free text action input: text field + "Calculate" button that queries AI for estimated roll cost before committing |
| — | Markdown in DM story text: install `react-native-markdown-display`, update StoryBox, allow Markdown in DM prompts |

---

## Architecture

```
app/
  _layout.tsx        Root Stack + GameProvider (wraps everything)
  index.tsx          Home screen — Solo / Multiplayer
  solo.tsx           Hero creation → calls makePlayer() → navigates to /game
  room.tsx           Create or join multiplayer room (Supabase)
  lobby.tsx          Waiting room — Supabase Realtime player list, host starts
  game.tsx           Main game loop (~290 lines, all logic here)
  result.tsx         Win/loss screen with stats

components/
  GameHeader.tsx         Title bar + AI badge + turn counter
  PlayerStatusBar.tsx    Name, class, HP bar, mana bar, gold, inventory toggle
  EffectsBar.tsx         Active status effect badges + environmental damage badge
  PhaseControls.tsx      Renders the correct UI for current phase (choose/roll/processing/merchant)
  ChoiceButtons.tsx      Action buttons with Need X+ and mana cost
  DiceRoller.tsx         Animated d20 — shows required roll, bonus, success/fail
  StoryBox.tsx           Scrollable DM narrative — shows storyHistory + streamingMessage
  InventoryPanel.tsx     Horizontal item scroll with Use button (consumables only)
  MerchantPanel.tsx      Buy/sell UI shown during merchant events
  HPBar.tsx              Colour-coded HP bar (green/yellow/red)
  ManaBar.tsx            Mana bar (purple)
  ClassSelector.tsx      3-card class picker

constants/
  game.ts            STATUS_CONFIG, CLASS_HP, CLASS_MANA, STARTING_SKILLS,
                     makePlayer(), EFFECT_ICONS, CONSUMABLE_EFFECTS, sellPrice()

services/
  dungeonMaster.ts       Active AI DM — Vercel AI Gateway (see DM section)
  mockDungeonMaster.ts   Fallback DM — no API key needed, procedural
  supabase.ts            Supabase client
  roomService.ts         createRoom, joinRoom, subscribeToRoom, updateRoomState

context/
  gameContext.tsx    GameState, useGame(), addItem(), removeItem(),
                     updatePlayerHP(), addStoryMessage(), setGameState()

types/index.ts       All shared types — Item, Player, Skill, GameRoom,
                     Message, ChoiceType, Choice, DungeonEvent, Situation, GameState
```

---

## Claude Code Skills & Plugins

### Global skills (auto-applied, no slash command needed)
Stored in `C:\Users\milor\.claude\skills\` — Claude loads these automatically per CLAUDE.md rules:

| Skill file | When to use |
|---|---|
| `superpowers.skill` | ALL coding tasks — structured planning, TDD, self-review before delivering |
| `self-healing.skill` | Any command that might fail — diagnose → fix → retry automatically |
| `cost-reducer.skill` | Before large agentic tasks — flag expensive ops, estimate token cost |
| `web-app-tester.skill` | Testing in browser/emulator — check JS errors, layout, API calls |
| `security-audit.skill` | Touching auth, API keys, DB, RLS, or before any commit with credentials |

### User-invocable skills (type `/skill-name`)

| Slash command | What it does |
|---|---|
| `/ai-sdk` | Answer questions about Vercel AI SDK (generateText, streamText, useChat, tool calling, etc.) |
| `/claude-api` | Build/debug Anthropic SDK apps, prompt caching, model migrations |
| `/review` | Review a pull request |
| `/security-review` | Full security review of pending branch changes |
| `/simplify` | Review changed code for reuse, quality and efficiency — then fix issues |
| `/init` | Initialize a new CLAUDE.md with codebase documentation |
| `/update-config` | Configure Claude Code via settings.json (hooks, permissions, env vars) |
| `/keybindings-help` | Customize keyboard shortcuts in `~/.claude/keybindings.json` |
| `/fewer-permission-prompts` | Scan transcripts and add an allowlist to reduce permission prompts |
| `/loop` | Run a prompt on a recurring interval |
| `/schedule` | Create scheduled remote agents (cron) |

### Installed plugins (from `claude-plugins-official` marketplace)
Notable ones available to install/use:

| Plugin | Purpose |
|---|---|
| `skill-creator` | Create new `.skill` files |
| `feature-dev` | End-to-end feature development workflow |
| `code-review` | Structured code review |
| `frontend-design` | UI/UX focused design help |
| `hookify` | Set up Claude Code hooks |
| `session-report` | Generate session summary reports |
| `context7` | Fetch up-to-date library documentation |
| `github` / `linear` / `playwright` | External service integrations |

---

## Game Loop (game.tsx)

```
'choose'     → Situation description in StoryBox, choice buttons shown
'roll'       → pendingChoice set, DiceRoller active
'processing' → getDMOutcome() called, outcome added to history, 1200ms pause,
               then getDMSituation() called for next scene → back to 'choose'
'merchant'   → MerchantPanel shown instead of choices
```

**Turn flow in detail:**
1. Mount: `getDMSituation(..., player)` with `openingPlayer` → generates first scene (streams via `onChunk`)
2. Player clicks a choice → `setPendingChoice`, `setPhase('roll')`
3. Player rolls → `handleRoll(rawRoll)`:
   - `effectiveRoll = rawRoll + rollBonus`
   - `getDMOutcome(...)` → applies damage/heal/item/gold/effect
   - Ticks active status effects (poison/burning deal damage, expired ones removed)
   - Applies environmental damage if present
   - 1200ms pause, then `getDMSituation(...)` → new scene
4. If `hp <= 0` → `/result?won=false`, if `questComplete` → `/result?won=true`

**Roll mechanics:**
- Each choice has `baseRequired` adjusted by class modifiers + item effects + active effects
- Class modifiers (warrior: combat−3, risky−1 | mage: social−2, tactical−1 | healer: recovery−3, tactical−1)
- Item mods: attackBoost→combat/risky, armorBoost→tactical, healBoost→recovery (all subtract from required)
- paralysis adds to required roll; blessed/strengthened reduce it

---

## AI Dungeon Master (dungeonMaster.ts)

### Provider setup
```ts
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1';
const MODEL       = 'google/gemini-3-flash';
// expo/fetch required for React Native streaming (not web)
const nativeFetch = Platform.OS !== 'web' ? require('expo/fetch').fetch : undefined;
const gatewayProvider = createOpenAI({ baseURL: GATEWAY_URL, apiKey: process.env.EXPO_PUBLIC_AI_GATEWAY_API_KEY, fetch: nativeFetch });
```

### Response format — CRITICAL
Situations use a two-part `STORY:/JSON:` format. **Never change this back to embedding description inside JSON** — Gemini compresses JSON string values regardless of length instructions.

```
STORY: [3-4 vivid atmospheric sentences]
JSON: {"event": "combat"|"treasure"|...|null, "choices": [...], "environmental_damage": ..., "merchant_inventory": ...}
```

### Parsing — CRITICAL rules
- **Regex for story:** `/STORY:\s*([\s\S]*?)(?=\n+JSON:)/i` — uses `\n+` (not `\n`) because Gemini inserts blank lines
- **Regex for streaming visibility:** `/\n+JSON:/i` — same reason
- **JSON extraction:** Does NOT use a simple regex — strips markdown code fences first (Gemini wraps JSON in backticks despite instructions), then finds first `{` and last `}`:
  ```ts
  const afterJson = raw.slice(jsonSectionIdx + 5).replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  data = parseJSON(afterJson.slice(afterJson.indexOf('{'), afterJson.lastIndexOf('}') + 1));
  ```
- **User messages must say "STORY: section"** — NOT "description field". The user message used to reference the old JSON format; that caused the model to put narrative inside JSON, breaking the parse.

### Streaming
- `aiChatStream` with mode `'story-json'` streams only the STORY: part (hides JSON from user)
- `aiChatStream` with mode `'json-field:story'` streams only the `story` field from outcome JSON
- `makeOnChunk()` in game.tsx creates a delta accumulator: `let acc=''; return (chunk) => { acc+=chunk; setStreamingText(acc); }`
- `setStreamingText('')` is called after the function returns — clears the streaming overlay once story is in history

### Functions
- `getDMOpening(player, difficulty, onChunk?)` — standalone opening (unused in current flow, situation opening used instead)
- `getDMSituation(difficulty, prevChoiceType, recentHistory, playerClass, onChunk?, openingPlayer?)` — generates next scene; pass `openingPlayer` for the first turn
- `getDMOutcome(...)` — generates outcome of player's action; returns `DungeonEvent`
- `warmUpModel()` — called on mount, sends a 1-token ping to warm the model

---

## Environment

```
.env (gitignored — NEVER commit)
  EXPO_PUBLIC_AI_GATEWAY_API_KEY=...   Vercel AI Gateway key
  EXPO_PUBLIC_SUPABASE_URL=...
  EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Supabase project ref: `powkwdwykfqljdfhfkca`
GitHub repo: `github.com/miloruf/dungeonquest`

---

## Dev Commands

```bash
npx expo start          # Start dev server (scan QR with Expo Go)
npx expo start --web    # Open in browser at localhost:8081
npx tsc --noEmit        # Type-check (must pass before every commit)
git push                # Push to main
```

---

## Change Log

| Date       | What changed |
|------------|-------------|
| 2026-05-11 | Initial solo flow, 5 UI components, Supabase setup, difficulty/item/class systems |
| 2026-05-11 | Situation/outcome split DM, recovery heals HP, previous action biases encounter |
| 2026-05-11 | Multiplayer: room.tsx + lobby.tsx + game.tsx turn system via Supabase Realtime |
| 2026-05-12 | Natural story ending (questComplete), gold system, merchant events |
| 2026-05-12 | Status effects (poison/burning/paralysis/blessed/strengthened), environmental damage |
| 2026-05-12 | Class skills as 4th action, mana system, skill leveling (3 uses → level up) |
| 2026-05-12 | Switched AI from Ollama to Vercel AI Gateway (google/gemini-3-flash) |
| 2026-05-12 | STORY:/JSON: two-part DM format to prevent Gemini from compressing narrative |
| 2026-05-12 | game.tsx refactored 675→290 lines; extracted GameHeader, PlayerStatusBar, EffectsBar, PhaseControls, MerchantPanel, InventoryPanel |
| 2026-05-12 | constants/game.ts: STATUS_CONFIG, makePlayer(), EFFECT_ICONS, sellPrice() — eliminated duplication across solo/room/ClassSelector |
| 2026-05-12 | Fixed DM parse bug: user messages referenced old "description field" format; JSON extraction now strips code fences; outcome streaming uses json-field:story mode |
