export type StatusEffectType = 'poison' | 'burning' | 'paralysis' | 'blessed' | 'strengthened';

export interface ActiveEffect {
  id: string;
  type: StatusEffectType;
  duration: number;   // turns remaining
  magnitude: number;  // damage/turn for negative; roll reduction for positive
}

export interface Item {
  id: string;
  name: string;
  description: string;
  effect: 'fireResistance' | 'poisonResistance' | 'attackBoost' | 'healBoost' | 'armorBoost' | 'rollBonus' | 'learnSkill' | 'manaRestore';
  power: number;
  skillData?: { name: string; description: string; type: ChoiceType; baseRequired: number };
}

export interface Player {
  id: string;
  name: string;
  class: 'warrior' | 'mage' | 'healer';
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  inventory: Item[];
  activeEffects: ActiveEffect[];
  skills: Skill[];
}

export interface MerchantItem {
  item: Item;
  price: number;
}

export interface GameRoom {
  roomCode: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'chaos';
  content: string;
}

export type ChoiceType = 'combat' | 'tactical' | 'social' | 'risky' | 'recovery';

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: ChoiceType;
  baseRequired: number;
  manaCost: number;
  level: number;
  useCount: number;
}

export interface Choice {
  text: string;
  type: ChoiceType;
  baseRequired: number;
}

export interface DungeonEvent {
  story: string;
  event: 'combat' | 'treasure' | 'trap' | 'mystery' | 'merchant' | null;
  item: Item | null;
  damage: number | null;
  heal: number | null;
  goldGained?: number | null;
  choices: Choice[];
  chaosStory?: string | null;
  questComplete?: boolean;
  applyEffect?: ActiveEffect | null;
}

export interface Situation {
  event: DungeonEvent['event'];
  description: string;
  choices: Choice[];
  environmentalDamage?: { type: 'poison' | 'burning' | 'cold'; magnitude: number } | null;
  merchantInventory?: MerchantItem[] | null;
}

export interface GameState {
  room: GameRoom;
  storyHistory: Message[];
  currentScene: string;
  currentSituation: Situation | null;
  lastEvent: DungeonEvent | null;
  diceResult: number | null;
}
