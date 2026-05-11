export interface Item {
  id: string;
  name: string;
  description: string;
  effect: 'fireResistance' | 'poisonResistance' | 'attackBoost' | 'healBoost' | 'armorBoost';
  power: number;
}

export interface Player {
  id: string;
  name: string;
  class: 'warrior' | 'mage' | 'healer';
  hp: number;
  maxHp: number;
  inventory: Item[];
  activeEffects: string[];
}

export interface GameRoom {
  roomCode: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DungeonEvent {
  story: string;
  event: 'combat' | 'treasure' | 'trap' | 'mystery' | null;
  item: Item | null;
  damage: number | null;
  choices: string[];
}

export interface GameState {
  room: GameRoom;
  storyHistory: Message[];
  currentScene: string;
  lastEvent: DungeonEvent | null;
  diceResult: number | null;
}
