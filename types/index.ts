export interface Item {
  id: string;
  name: string;
  description: string;
  effect: 'fireResistance' | 'poisonResistance' | 'attackBoost' | 'healBoost' | 'armorBoost' | 'rollBonus';
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
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type ChoiceType = 'combat' | 'tactical' | 'social' | 'risky' | 'recovery';

export interface Choice {
  text: string;
  type: ChoiceType;
  baseRequired: number;
}

export interface DungeonEvent {
  story: string;
  event: 'combat' | 'treasure' | 'trap' | 'mystery' | null;
  item: Item | null;
  damage: number | null;
  heal: number | null;
  choices: Choice[];
}

export interface Situation {
  event: DungeonEvent['event'];
  description: string;
  choices: Choice[];
}

export interface GameState {
  room: GameRoom;
  storyHistory: Message[];
  currentScene: string;
  currentSituation: Situation | null;
  lastEvent: DungeonEvent | null;
  diceResult: number | null;
}
