# DungeonQuest – Architektur & Datenmodell

> Aufgabe 6.3 | UEK 335 – Mobile Apps entwickeln | React Native + Expo

---

## 1. Komponenten

Wiederverwendbare UI-Bausteine:

| Komponente | Beschreibung |
|---|---|
| `PlayerCard` | Zeigt Spielername, Klasse, HP-Balken und Inventar |
| `DiceRoller` | Würfel-Animation + Ergebnis (1–20) |
| `ActionButton` | Angriff / Verteidigen / Heilen / Fähigkeit |
| `StoryBox` | Scrollbarer Text vom KI-Dungeon Master |
| `RoomCodeInput` | Eingabefeld für 6-stelligen Raumcode |
| `ClassSelector` | Klasse wählen mit Icon (Krieger / Magier / Heiler) |
| `HPBar` | Lebensanzeige als farbiger Balken |
| `InventoryCard` | Zeigt ein Item mit Name, Beschreibung und Effekt |
| `EventModal` | Popup bei Treasure / Trap / Mystery Events |
| `ChoiceButtons` | 2–3 Auswahloptionen die der DM vorschlägt |

---

## 2. Navigation

**Schema:** Stack-Navigation mit Expo Router (Push / Back)

```
app/
├── _layout.tsx       → Stack + GameProvider (globaler Context)
├── index.tsx         → Home Screen (Multiplayer / Solo wählen)
├── room.tsx          → Raum erstellen oder via Code joinen
├── lobby.tsx         → Lobby: Spieler warten, Klasse wählen
├── game.tsx          → Kampf Screen (Hauptspiel)
├── solo.tsx          → Solo-Mode Screen (Schwierigkeit wählen)
└── result.tsx        → Ergebnis Screen (Sieg / Niederlage)
```

**Navigationsfluss:**
- Home → Room → Lobby → Game → Result
- Home → Solo → Game → Result
- Result → Home (Hauptmenü)
- Result → Lobby (Nochmal spielen)

---

## 3. Datenmodell

### Item

```typescript
interface Item {
  id: string;
  name: string;                // z.B. "Feuerschutz-Ring"
  description: string;         // z.B. "Schützt vor Feuerschaden"
  effect: 'fireResistance'
        | 'poisonResistance'
        | 'attackBoost'
        | 'healBoost'
        | 'armorBoost';
  power: number;               // z.B. 25 = 25% Bonus
}
```

### Player

```typescript
interface Player {
  id: string;
  name: string;
  class: 'warrior' | 'mage' | 'healer';
  hp: number;
  maxHp: number;
  inventory: Item[];           // gefundene Items
  activeEffects: string[];     // z.B. ['fireResistance']
}
```

### GameRoom

```typescript
interface GameRoom {
  roomCode: string;            // 6-stelliger Code zum Joinen
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: string;         // Player id wer dran ist
  difficulty: 'easy' | 'medium' | 'hard';
}
```

### Message (KI-Dungeon Master Verlauf)

```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
}
```

### DungeonEvent (KI-Antwort Format)

Die KI gibt immer strukturiertes JSON zurück:

```typescript
interface DungeonEvent {
  story: string;               // 2-3 Sätze Beschreibung
  event: 'combat'
       | 'treasure'
       | 'trap'
       | 'mystery'
       | null;
  item: Item | null;           // nur bei 'treasure' Events
  damage: number | null;       // nur bei 'combat' / 'trap'
  choices: string[];           // 2-3 Optionen für den Spieler
}
```

### GameState (globaler Context)

```typescript
interface GameState {
  room: GameRoom;
  storyHistory: Message[];     // ganzer KI-Chatverlauf
  currentScene: string;        // aktuelle Szene / Ort
  lastEvent: DungeonEvent | null;
  diceResult: number | null;
}
```

---

## 4. Zustand & Side-Effects

### State-Verteilung

| State | Wo | Warum |
|---|---|---|
| `players`, `room`, `storyHistory` | **Context (global)** | Alle Screens brauchen es |
| `lastEvent`, `currentScene` | **Context (global)** | Screens teilen Spielzustand |
| `showDice`, `selectedAction` | **useState (lokal)** | Nur im Game-Screen relevant |
| `diceResult` | **useState (lokal)** | Nur kurz sichtbar nach Wurf |
| `isLoading` | **useState (lokal)** | KI-API Ladezustand |

### Side-Effects

```typescript
// KI aufrufen wenn Spieler eine Aktion trifft
useEffect(() => {
  if (!selectedAction) return;
  fetchDungeonMasterResponse(selectedAction, diceResult, gameState);
}, [selectedAction]);

// Raumdaten laden beim Mount der Lobby
useEffect(() => {
  loadRoom(roomCode);
}, []);

// Story-Verlauf in AsyncStorage speichern (Persistenz)
useEffect(() => {
  AsyncStorage.setItem('story_history', JSON.stringify(storyHistory));
}, [storyHistory]);
```

---

## 5. KI-Dungeon Master Integration

### System-Prompt

```typescript
const DUNGEON_MASTER_PROMPT = `
Du bist ein erfahrener Dungeon Master. Antworte NUR in diesem JSON-Format:

{
  "story": "Beschreibung (2-3 Sätze, dramatisch und atmosphärisch)",
  "event": "combat" | "treasure" | "trap" | "mystery" | null,
  "item": {
    "id": "uuid",
    "name": "Feuerschutz-Ring",
    "description": "Schützt vor Feuerschaden",
    "effect": "fireResistance",
    "power": 25
  } | null,
  "damage": number | null,
  "choices": ["Option 1", "Option 2", "Option 3"]
}

Regeln:
- Items nur bei treasure Events generieren
- Bei combat/trap: damage zwischen 5-30 je nach Schwierigkeit
- Immer 2-3 choices anbieten
- Hoher Würfelwurf (15-20) = Erfolg / gutes Ergebnis
- Tiefer Würfelwurf (1-5) = Misserfolg / schlechtes Ergebnis
- Reagiere auf die Klasse des Spielers
- Sprache: Deutsch
`;
```

### Item-Effekte auf Kampf

```typescript
const calculateDamage = (rawDamage: number, player: Player): number => {
  let damage = rawDamage;

  if (player.activeEffects.includes('fireResistance')) {
    damage = damage * 0.75;   // 25% weniger Feuerschaden
  }
  if (player.activeEffects.includes('armorBoost')) {
    damage = damage * 0.85;   // 15% weniger Schaden generell
  }

  return Math.round(damage);
};
```

### Beispiel-Items die die KI generiert

| Item | Effekt | Typischer Fundort |
|---|---|---|
| Feuerschutz-Ring | -25% Feuerschaden | Drachenhöhle |
| Heiltrank | +30 HP sofort | Geheimraum |
| Magier-Stab | +20% Magieschaden | Zaubererturm |
| Giftresistenz-Amulett | Immun gegen Gift | Sumpf-Event |
| Schild der Ahnen | +15% Rüstung | Grabkammer |

---

## 6. Ordnerstruktur

```
dungeonquest/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── room.tsx
│   ├── lobby.tsx
│   ├── game.tsx
│   ├── solo.tsx
│   └── result.tsx
├── components/
│   ├── PlayerCard.tsx
│   ├── DiceRoller.tsx
│   ├── ActionButton.tsx
│   ├── StoryBox.tsx
│   ├── RoomCodeInput.tsx
│   ├── ClassSelector.tsx
│   ├── HPBar.tsx
│   ├── InventoryCard.tsx
│   ├── EventModal.tsx
│   └── ChoiceButtons.tsx
├── context/
│   └── gameContext.tsx        → GameProvider + useGame()
├── services/
│   └── dungeonMaster.ts       → Claude API Calls
├── types/
│   └── index.ts               → alle Interfaces
└── docs/
    └── architecture.md        → diese Datei
```

---

*Erstellt im Rahmen des UEK 335 – Mobile Apps entwickeln*
