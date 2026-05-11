# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skills

The following global skills are available and should be used automatically when relevant:

- `C:\Users\milor\.claude\skills\superpowers.skill` — Use for ALL coding tasks: structured planning, TDD, self-review before delivering code
- `C:\Users\milor\.claude\skills\self-healing.skill` — Use when running commands or code that might fail: diagnose → fix → retry automatically
- `C:\Users\milor\.claude\skills\cost-reducer.skill` — Use before large agentic tasks: flag expensive operations, estimate token costs
- `C:\Users\milor\.claude\skills\web-app-tester.skill` — Use when testing the app in browser/emulator: check JS errors, layout, API calls
- `C:\Users\milor\.claude\skills\security-audit.skill` — Use when touching auth, API keys, DB access, RLS policies, or before any commit/push that involves credentials or sensitive config

## Commands

```bash
npx expo start          # Start dev server (scan QR with Expo Go)
npx expo start --android
npx expo start --ios
npx expo start --web
npx tsc --noEmit        # Type-check without building
```

No test runner is configured yet.

## Architecture

**Routing:** Expo Router (file-based). All screens live in `app/`. `app/_layout.tsx` is the root — it wraps the entire Stack navigator in `GameProvider` so every screen has access to global game state.

**State:** Single `GameState` object held in `context/gameContext.tsx`. All game data (room, players, story history, last event, dice result) lives here. Screens read state via `useGame()` and mutate it through the four helper functions (`addItem`, `updatePlayerHP`, `setDiceResult`, `addStoryMessage`) or directly via `setGameState` for compound updates.

**AI integration:** `services/mockDungeonMaster.ts` is the active DM (no API key needed). `services/dungeonMaster.ts` contains the real Claude API implementation for future use. `services/supabase.ts` initializes the Supabase client from `EXPO_PUBLIC_SUPABASE_*` env vars.

**Multiplayer:** Supabase Realtime via `services/roomService.ts`. Room state lives in the `rooms` table (see `docs/schema.sql`). `subscribeToRoom()` returns a channel — always call `.unsubscribe()` in the `useEffect` cleanup.

**Types:** All shared interfaces are in `types/index.ts`. `DungeonEvent` is the exact JSON schema the system prompt enforces — if you change the interface, update the system prompt in `dungeonMaster.ts` to match.

**Screens:** `room`, `lobby`, `game`, `solo`, `result` are placeholder stubs. `index.tsx` is the only fully implemented screen.

## Conventions

- lowerCamelCase for variables and functions, UpperCamelCase for components and interfaces
- UI logic stays in `app/` and `components/`; business logic belongs in `services/` or `context/`
- `strict: true` TypeScript — no implicit `any`, use `?.` for nullable access
- Always clean up `useEffect` subscriptions

## UEK 335 Context

This project is the individual project for module 335 (Mobile Apps entwickeln). Block 6 (planning/setup) is complete. Block 7 adds combat logic, real AI integration, and multiplayer. Supporting documents (architecture, storyboard, go-to-market) are in `335unterlagen/`.
