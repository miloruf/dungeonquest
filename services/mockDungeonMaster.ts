import { Choice, ChoiceType, DungeonEvent, GameRoom, GameState, Item, Player } from '../types';

// ─── Stories ────────────────────────────────────────────────────────────────

const STORIES = {
  combat: [
    "A skeletal warrior emerges from the shadows, its bony fingers clutching a rusted sword. It charges with surprising speed!",
    "A cave troll blocks the narrow passage, growling and beating its chest. The ground shakes with each thunderous step.",
    "Three goblin scouts surround you, cackling with malicious glee. Their crude blades glint in the torchlight.",
    "A wraith materialises from the dungeon wall — an ancient guardian bound to protect this place for eternity.",
    "A stone golem awakens, its eyes blazing with eldritch fire. It was designed to destroy trespassers.",
  ],
  treasure: [
    "Behind a loose stone you discover a hidden alcove containing a glimmering artifact.",
    "An ornate chest sits untouched in the centre of the room. The lock is already broken — someone was here before you.",
    "The skeleton of a long-dead adventurer clutches something valuable in its bony hand.",
    "A shrine to a forgotten deity holds an offering of power — unclaimed for centuries.",
  ],
  trap: [
    "Click. Your boot triggers a pressure plate. Darts shoot from the walls!",
    "The floor crumbles beneath your feet — you barely catch yourself on the ledge.",
    "A hidden trip wire releases a cascade of poisoned spikes from the ceiling.",
    "The room fills with toxic gas as a hidden mechanism activates. Your eyes burn.",
    "Magical runes ignite under your feet — a sorcerer's ward, still active after all these years.",
  ],
  mystery: [
    "Strange runes glow on the walls, pulsing with an otherworldly light. The air hums with ancient magic.",
    "You find a door with no handle, only a riddle carved in stone: 'I speak without a mouth and hear without ears.'",
    "A ghostly figure appears, gesturing urgently before fading into the darkness.",
    "A pool of liquid silver ripples at the centre of the chamber — it shows visions of your past.",
  ],
  success: [
    "Your decisive action turns the tide. The threat is neutralised and the path forward is clear.",
    "Fortune favours the bold — your gamble pays off spectacularly.",
    "With skill and precision, you overcome the obstacle.",
    "Your training proves its worth. The situation is firmly under control.",
  ],
  failure: [
    "Despite your best efforts, things don't go as planned. You'll need to regroup.",
    "A critical mistake costs you dearly. Tread more carefully next time.",
    "The dungeon claims its toll — this won't be your last setback.",
    "You underestimated the danger. The wound will remind you to be more careful.",
  ],
};

// ─── Choices (base required rolls tuned for medium difficulty) ───────────────

const BASE_CHOICES: Record<string, Choice[]> = {
  combat: [
    { text: 'Attack with full force',          type: 'combat',   baseRequired: 13 },
    { text: 'Defend and look for an opening',  type: 'tactical', baseRequired: 9  },
    { text: 'Try to outmaneuver the enemy',    type: 'tactical', baseRequired: 10 },
  ],
  treasure: [
    { text: 'Grab the item quickly',           type: 'risky',    baseRequired: 5  },
    { text: 'Examine it carefully for traps',  type: 'tactical', baseRequired: 8  },
    { text: 'Leave it — could be cursed',      type: 'social',   baseRequired: 1  },
  ],
  trap: [
    { text: 'Push through the pain',           type: 'combat',   baseRequired: 12 },
    { text: 'Find an alternate route',         type: 'tactical', baseRequired: 9  },
    { text: 'Search for the trigger mechanism', type: 'tactical', baseRequired: 11 },
  ],
  mystery: [
    { text: 'Investigate the anomaly',         type: 'risky',    baseRequired: 10 },
    { text: 'Ignore it and move on',           type: 'social',   baseRequired: 3  },
    { text: 'Try to interact with it',         type: 'social',   baseRequired: 7  },
  ],
  default: [
    { text: 'Proceed cautiously',              type: 'tactical', baseRequired: 8  },
    { text: 'Explore the area thoroughly',     type: 'risky',    baseRequired: 11 },
    { text: 'Rest and recover',                type: 'recovery', baseRequired: 5  },
  ],
};

// ─── Dynamic item generation ─────────────────────────────────────────────────

const ITEM_PREFIXES_COMMON = ['Ancient', 'Worn', 'Dusty', 'Rusted', 'Cracked', 'Faded', 'Simple'];
const ITEM_PREFIXES_RARE   = ['Legendary', 'Divine', 'Void-Touched', 'Ethereal', "God's", 'Mythic', 'Arcane'];

const ITEM_BASES: Record<Item['effect'], string[]> = {
  rollBonus:        ["Gambler's Die", 'Fate Coin', 'Lucky Charm', 'Fortune Rune', 'Destiny Token'],
  attackBoost:      ['War Bracer', 'Battle Sigil', 'Blade Shard', 'Warrior Ring', 'Combat Rune'],
  armorBoost:       ['Iron Ward', 'Shield Rune', 'Defender Stone', 'Guardian Seal', 'Bulwark Charm'],
  healBoost:        ['Healing Crystal', 'Life Pendant', 'Vitality Rune', 'Mending Stone', 'Recovery Vial'],
  fireResistance:   ['Ember Cloak', 'Flame Ward', "Dragon's Scale", 'Asbestos Ring', 'Inferno Guard'],
  poisonResistance: ['Antidote Flask', 'Venom Ward', 'Herbal Charm', 'Toxin Glyph', 'Poison Mask'],
};

const EFFECT_DESC: Record<Item['effect'], (p: number) => string> = {
  rollBonus:        p => `+${p} to all dice rolls`,
  attackBoost:      p => `-${p} required for combat actions`,
  armorBoost:       p => `-${p} required for defensive actions`,
  healBoost:        p => `-${p} required for recovery actions`,
  fireResistance:   p => `-${p} damage from fire traps`,
  poisonResistance: p => `-${p} damage from poison traps`,
};

// Power ranges: small integers that map directly to modifiers
const POWER_RANGES: Record<Item['effect'], [number, number][]> = {
  //                         [common],   [rare]
  rollBonus:        [[1, 2], [3, 5]],
  attackBoost:      [[1, 2], [2, 4]],
  armorBoost:       [[1, 2], [2, 4]],
  healBoost:        [[1, 2], [2, 4]],
  fireResistance:   [[1, 2], [2, 3]],
  poisonResistance: [[1, 2], [2, 3]],
};

function generateItem(difficulty: GameRoom['difficulty'], rare: boolean): Item {
  const effects = Object.keys(ITEM_BASES) as Item['effect'][];
  const effect  = pick(effects);

  const [min, max] = POWER_RANGES[effect][rare ? 1 : 0];
  const power  = min + Math.floor(Math.random() * (max - min + 1));
  const prefix = rare ? pick(ITEM_PREFIXES_RARE) : pick(ITEM_PREFIXES_COMMON);
  const base   = pick(ITEM_BASES[effect]);

  // Hard difficulty items slightly stronger
  const finalPower = difficulty === 'hard' && rare ? Math.min(max + 1, power + 1) : power;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: `${prefix} ${base}`,
    description: EFFECT_DESC[effect](finalPower),
    effect,
    power: finalPower,
  };
}

// ─── Event distribution ───────────────────────────────────────────────────────

const EVENT_DIST: Record<GameRoom['difficulty'], [number, number, number, number]> = {
  easy:   [0.20, 0.60, 0.75, 0.90],
  medium: [0.30, 0.50, 0.65, 0.80],
  hard:   [0.45, 0.55, 0.85, 0.97],
};

// ─── Opening story ────────────────────────────────────────────────────────────

const CLASS_INTROS: Record<Player['class'], string[]> = {
  warrior: [
    'Battle-scarred and fearless, you have fought in a hundred wars',
    'Your blade has tasted the blood of monsters and kings alike',
    'The guild calls you their finest sword — now you must prove it',
  ],
  mage: [
    'Arcane energy crackles at your fingertips, barely contained',
    'Ancient scrolls led you here — this dungeon holds secrets your masters feared to speak aloud',
    'You feel the ley lines pulsing beneath the stone, calling to your power',
  ],
  healer: [
    'Your divine light flickers against the darkness ahead',
    'The gods whispered your name when this dungeon appeared — you answered',
    'Where others carry swords, you carry hope — and it burns brighter than any torch',
  ],
};

const QUEST_HOOKS = [
  "A dying merchant pressed a map into your hands with his last breath. \"The Amulet of Eternity lies within,\" he rasped. \"Don't let it fall to darkness.\"",
  "Your guild posted the bounty three months ago. Seven adventurers entered. None returned. You will be different.",
  "The village children are wasting away — only the Philosopher's Stone hidden deep within can save them. You have no choice.",
  "A rival adventurer entered at dawn. You cannot let them claim the glory — or the artifact — first.",
  "The dungeon appeared overnight, splitting the earth open. Something ancient wants to be found. You intend to find it first.",
  "The king offered a full pardon — in exchange for whatever lies at the dungeon's heart. A dangerous bargain. Your only one.",
];

const DIFFICULTY_FLAVOUR: Record<GameRoom['difficulty'], string> = {
  easy:   'The dungeon breathes quietly tonight. Dangers lurk, but nothing a seasoned hero cannot handle.',
  medium: 'The dungeon is alive with malice. Every shadow hides a threat. Every step could be your last.',
  hard:   'This place is a death trap crafted by ancient gods. The creatures within are legendary. The traps are lethal. But the loot... divine artifacts lie unclaimed in the deepest chambers. Survive, and you will be immortal.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export function getMaxTurns(difficulty: GameRoom['difficulty']): number {
  return { easy: 8, medium: 12, hard: 15 }[difficulty];
}

export function getOpeningStory(player: Player, difficulty: GameRoom['difficulty']): string {
  const intro   = pick(CLASS_INTROS[player.class]);
  const hook    = pick(QUEST_HOOKS);
  const flavour = DIFFICULTY_FLAVOUR[difficulty];
  return `${intro}, ${player.name} stands at the dungeon entrance.\n\n${hook}\n\n${flavour}\n\nChoose your first action to begin.`;
}

export function getMockDungeonMasterResponse(
  playerAction: string,
  effectiveRoll: number,
  requiredRoll: number,
  gameState: GameState,
): DungeonEvent {
  const diff      = gameState.room.difficulty;
  const isCritical = effectiveRoll === 20;
  const isFumble   = effectiveRoll <= 2;
  const margin     = effectiveRoll - requiredRoll;
  const isSuccess  = margin >= 0;
  const isGreat    = margin >= 6;

  // Event type
  const dist = EVENT_DIST[diff];
  let event: DungeonEvent['event'];
  if      (isCritical) event = 'treasure';
  else if (isFumble)   event = 'trap';
  else {
    const r = Math.random();
    if      (r < dist[0]) event = 'combat';
    else if (r < dist[1]) event = 'treasure';
    else if (r < dist[2]) event = 'trap';
    else if (r < dist[3]) event = 'mystery';
    else                  event = null;
  }

  // Damage
  const base      = { easy: 5, medium: 10, hard: 18 }[diff];
  const hardExtra = diff === 'hard' ? Math.floor(Math.random() * 8) : 0;
  let damage: number | null = null;
  if (event === 'combat' || event === 'trap') {
    if      (isFumble)  damage = base * 2 + hardExtra;
    else if (isGreat)   damage = null;
    else if (isSuccess) damage = Math.max(1, Math.floor(base * 0.3));
    else                damage = base + Math.floor(Math.random() * 8) + hardExtra;
  }

  // Item — rare on great success or hard+high roll
  const useRare = isGreat || (diff === 'hard' && effectiveRoll >= 16);
  const item    = event === 'treasure' ? generateItem(diff, useRare) : null;

  // Roll descriptor
  let rollTag: string;
  if      (isCritical)  rollTag = 'Critical Hit!';
  else if (isFumble)    rollTag = 'Fumble!';
  else if (isGreat)     rollTag = `Great Success (+${margin})`;
  else if (isSuccess)   rollTag = `Success (+${margin})`;
  else                  rollTag = `Failed (${Math.abs(margin)} short of ${requiredRoll})`;

  const storyKey  = event ?? (isSuccess ? 'success' : 'failure');
  const storyPool = STORIES[storyKey as keyof typeof STORIES] ?? STORIES.success;
  const story     = `${pick(storyPool)} [${effectiveRoll}/20 — ${rollTag}]`;

  // Choices — apply difficulty modifier to baseRequired
  const diffMod = { easy: -2, medium: 0, hard: 3 }[diff];
  const rawChoices = BASE_CHOICES[event ?? 'default'] ?? BASE_CHOICES.default;
  const choices: Choice[] = rawChoices.map(c => ({
    ...c,
    baseRequired: Math.max(1, c.baseRequired + diffMod),
  }));

  return { story, event, item, damage, choices };
}
