# DungeonQuest

Ein D&D-inspiriertes Multiplayer-Spiel für 3–6 Spieler mit einem KI-Dungeon Master.

## Projektbeschreibung

DungeonQuest ist eine mobile App, bei der Spieler gemeinsam oder alleine in prozedural generierten Dungeons kämpfen. Ein KI-Dungeon Master (Claude API) erzählt die Geschichte dynamisch und reagiert auf Würfelwürfe und Spielerentscheidungen.

**Zielgruppe:** Tabletop-RPG-Fans (16–30 Jahre), die gemeinsam mit Freunden oder solo ein schnelles Dungeon-Abenteuer erleben wollen.

## Tech-Stack

| Technologie | Version | Verwendung |
|---|---|---|
| React Native | 0.81 | UI-Framework |
| Expo | ~54 | Build-Tool & SDK |
| Expo Router | ~6 | Stack-Navigation |
| TypeScript | ~5.9 | Typsicherheit |
| Claude API | claude-sonnet-4 | KI-Dungeon Master |

## Installation

```bash
# 1. Repository klonen
git clone <repo-url>
cd dungeonquest

# 2. Abhängigkeiten installieren
npm install

# 3. App starten
npx expo start
```

## Starten

```bash
npx expo start        # QR-Code für Expo Go
npx expo start --android
npx expo start --ios
```

Zum Testen: **Expo Go** App auf dem Gerät installieren und QR-Code scannen.

## Projektstruktur

```
dungeonquest/
├── app/              → Screens (Expo Router)
├── components/       → Wiederverwendbare UI-Komponenten
├── context/          → GameContext (globaler State)
├── services/         → dungeonMaster.ts (Claude API)
├── types/            → index.ts (alle Interfaces)
└── docs/             → architecture.md
```

## Umgebungsvariablen

Für die Claude API wird ein API-Key benötigt:
- Key erhältlich unter: https://console.anthropic.com
- In der App als Parameter übergeben (`.env` in Block 7)

## Nächste Schritte (Block 7)

- [ ] Raum erstellen / beitreten (Multiplayer)
- [ ] Klassenauswahl in der Lobby
- [ ] Würfelmechanik implementieren
- [ ] Claude API Integration im Game-Screen
- [ ] Kampf-Logik (HP, Items, Schaden)
- [ ] Solo-Mode Schwierigkeitsauswahl

## One-Pager (Aufgabe 6.1)

Siehe `335unterlagen/` für den Go-to-Market One-Pager und das Storyboard (Aufgabe 6.2).

---

*UEK 335 – Mobile Apps entwickeln*
