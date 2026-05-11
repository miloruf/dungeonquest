import { Choice, ChoiceType, DungeonEvent, GameRoom, Item, Player, Situation } from '../types';

// ─── Situation stories — what you ENCOUNTER ──────────────────────────────────

const SITUATION_STORIES: Record<string, string[]> = {
  combat: [
    "The torchlight catches movement ahead — something hostile lurks in the shadows.",
    "A guttural growl reverberates through the stone corridor. You are not alone.",
    "You round a corner and find your path blocked by a creature that does not intend to let you pass.",
    "The air grows thick with a foul stench. An enemy rises from the darkness.",
    "Bones crunch underfoot. Before you can react, something lunges from the dark.",
    "A skeletal warrior emerges from a hidden alcove, sword already raised.",
    "Three goblin scouts drop from the ceiling, cackling with malicious glee.",
    "A cave troll blocks the narrow passage, beating its chest with thunderous force.",
  ],
  treasure: [
    "Your torchlight catches a glimmer in the rubble — something valuable lies nearby.",
    "A wooden chest, half-buried in dust, sits against the far wall. The lock looks old.",
    "A skeletal figure slumped in the corner clutches something valuable in its bony grip.",
    "You find a shrine to a forgotten god. An offering rests on the altar, unclaimed for centuries.",
    "A loose stone in the wall gives way, revealing a hidden cache.",
    "The skeleton of an adventurer still wears a glinting item — your luck, their loss.",
  ],
  trap: [
    "The floor ahead looks wrong — stones arranged too perfectly, a faint mechanical smell in the air.",
    "Your instincts flare. Something in this room is designed to hurt you.",
    "Faint scratches mark where others have triggered this before. Careful.",
    "A faint hiss from the walls. Pressure plates, tripwires — this room was built to kill.",
    "A door ahead bears warning marks scratched by some previous, doomed adventurer.",
    "The air smells of old poison. This section of the dungeon hasn't forgiven anyone in years.",
  ],
  mystery: [
    "Strange runes pulse on the walls, glowing with energy you cannot explain.",
    "A door stands before you with no handle — only a riddle carved into the stone.",
    "A ghostly figure drifts through the chamber, gesturing urgently at something unseen.",
    "The air here feels charged with ancient magic. Something powerful happened in this room.",
    "A pool of silver liquid ripples without wind, showing you images you don't understand.",
    "Whispers fill the chamber. You cannot make out the words, but they feel urgent.",
  ],
  null: [
    "The corridor stretches ahead in silence. Nothing stirs.",
    "A quiet chamber. For a moment, the dungeon breathes.",
    "The path ahead is empty. No immediate threat presents itself.",
    "A brief respite. The dungeon watches, but does not move.",
    "Dripping water. Distant echoes. Nothing close.",
  ],
};

// ─── Outcome stories — what happens AS A RESULT of your action ───────────────

const OUTCOME_STORIES: Record<ChoiceType, Record<'great' | 'success' | 'fail' | 'fumble', string[]>> = {
  combat: {
    great:   [
      "A devastating strike. The enemy drops before it can react.",
      "Perfect form — the fight ends almost before it begins.",
      "You read every move and counter perfectly. Flawless.",
    ],
    success: [
      "A hard-fought victory. You take some punishment, but emerge standing.",
      "Your weapon finds its mark. The creature falls, defeated.",
      "Not pretty, but effective. You win.",
    ],
    fail:    [
      "Your attack is deflected. The enemy retaliates with brutal efficiency.",
      "You misjudge the strike and leave yourself completely open.",
      "The blow lands — on you. The creature is faster than it looks.",
    ],
    fumble:  [
      "You stumble on the wet stone. The creature seizes the moment without mercy.",
      "A catastrophic mistake — you take the full brunt of the attack.",
      "Your weapon slips. The enemy makes you pay for every second of it.",
    ],
  },
  tactical: {
    great:   [
      "Your careful approach reveals exactly what you needed. You navigate the situation perfectly.",
      "Flawless execution — you outmanoeuvre the obstacle entirely.",
      "Every angle covered. It couldn't have gone better.",
    ],
    success: [
      "Your measured response pays off. The situation resolves in your favour.",
      "Steady and calculated. It works.",
      "Not the most exciting outcome, but the right one.",
    ],
    fail:    [
      "Despite your care, something goes wrong. The situation turns against you.",
      "Your caution is not enough this time.",
      "You read it wrong. The dungeon corrects you.",
    ],
    fumble:  [
      "Your hesitation costs you dearly. The worst case plays out.",
      "The careful plan falls apart in spectacular fashion.",
      "Overthinking it was your undoing.",
    ],
  },
  social: {
    great:   [
      "Your words land perfectly. The tension dissolves entirely.",
      "A masterful read of the situation. It bends entirely to your intent.",
      "Whatever you said — it worked. Completely.",
    ],
    success: [
      "Your approach works well enough to get what you need.",
      "Not perfect, but effective.",
      "The situation yields. Mostly.",
    ],
    fail:    [
      "Your gambit doesn't land. The situation resists.",
      "The attempt falls flat.",
      "Wrong tone, wrong moment. It doesn't go your way.",
    ],
    fumble:  [
      "Badly misread. Things are now actively worse than before.",
      "A social catastrophe. You made it worse.",
      "Whatever you said — it was exactly the wrong thing.",
    ],
  },
  risky: {
    great:   [
      "The gamble pays off beyond all expectation. Fortune rewards boldness tonight.",
      "High risk, spectacular reward. Every bit worth it.",
      "You shouldn't have survived that. But here you are.",
    ],
    success: [
      "The risk was worth it. You get what you came for.",
      "Bold — and rewarded for it.",
      "It worked. Against the odds, it worked.",
    ],
    fail:    [
      "The gamble doesn't pay off this time. You pay the price.",
      "Too risky. It goes wrong in exactly the way you feared.",
      "Fortune is not with you today.",
    ],
    fumble:  [
      "A catastrophic gamble. Everything that could go wrong, does.",
      "The dungeon punishes recklessness without mercy.",
      "You rolled the dice on your life and nearly lost.",
    ],
  },
  recovery: {
    great:   [
      "A rare moment of true rest in the dungeon. You feel genuinely restored.",
      "You find a quiet spot and properly tend your wounds. Better.",
      "The rest is short but deep. You wake sharper than before.",
    ],
    success: [
      "The brief rest helps. You feel steadier.",
      "You patch yourself up and recover your bearings.",
      "Not fully healed, but better than before.",
    ],
    fail:    [
      "You barely manage to rest before something disturbs the silence.",
      "The attempt to recover is cut short by the dungeon's patience running out.",
      "Rest denied. The dungeon doesn't give you the moment.",
    ],
    fumble:  [
      "While resting, something finds you. The worst possible moment to drop your guard.",
      "You fall into a light sleep — and wake to immediate danger.",
      "Defenceless and discovered. The dungeon is merciless.",
    ],
  },
};

// ─── Choices per situation ────────────────────────────────────────────────────

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
    { text: 'Press forward aggressively',      type: 'combat',   baseRequired: 11 },
    { text: 'Proceed with caution',            type: 'tactical', baseRequired: 8  },
    { text: 'Rest and recover',                type: 'recovery', baseRequired: 5  },
  ],
};

// What previous action type biases the next situation
const ACTION_SITUATION_BIAS: Record<ChoiceType, [number, number, number, number]> = {
  //              combat  treasure  trap    mystery  (null fills remainder)
  combat:   [0.55, 0.70,   0.85,   0.95],  // more combat after fighting
  tactical: [0.25, 0.55,   0.70,   0.85],  // balanced
  social:   [0.10, 0.50,   0.60,   0.85],  // more treasure & mystery
  risky:    [0.30, 0.65,   0.90,   0.97],  // treasure but also traps
  recovery: [0.08, 0.14,   0.20,   0.35],  // mostly quiet (null)
};

const EVENT_DIST: Record<GameRoom['difficulty'], [number, number, number, number]> = {
  easy:   [0.20, 0.60, 0.75, 0.90],
  medium: [0.30, 0.50, 0.65, 0.80],
  hard:   [0.45, 0.55, 0.85, 0.97],
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

const POWER_RANGES: Record<Item['effect'], [[number, number], [number, number]]> = {
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
  const finalPower = difficulty === 'hard' && rare ? Math.min(max + 1, power + 1) : power;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: `${prefix} ${base}`,
    description: EFFECT_DESC[effect](finalPower),
    effect,
    power: finalPower,
  };
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMaxTurns(difficulty: GameRoom['difficulty']): number {
  return { easy: 8, medium: 12, hard: 15 }[difficulty];
}

export function getOpeningStory(player: Player, difficulty: GameRoom['difficulty']): string {
  const intro   = pick(CLASS_INTROS[player.class]);
  const hook    = pick(QUEST_HOOKS);
  const flavour = DIFFICULTY_FLAVOUR[difficulty];
  return `${intro}, ${player.name} stands at the dungeon entrance.\n\n${hook}\n\n${flavour}`;
}

/**
 * Generate what the player ENCOUNTERS next.
 * prevChoiceType biases the encounter — resting leads to quiet rooms,
 * fighting leads to more combat, etc.
 */
export function generateSituation(
  difficulty: GameRoom['difficulty'],
  prevChoiceType: ChoiceType | null,
): Situation {
  const dist    = prevChoiceType ? ACTION_SITUATION_BIAS[prevChoiceType] : EVENT_DIST[difficulty];
  const diffMod = { easy: -2, medium: 0, hard: 3 }[difficulty];
  const r       = Math.random();

  let event: DungeonEvent['event'];
  if      (r < dist[0]) event = 'combat';
  else if (r < dist[1]) event = 'treasure';
  else if (r < dist[2]) event = 'trap';
  else if (r < dist[3]) event = 'mystery';
  else                  event = null;

  const descKey    = event ?? 'null';
  const description = pick(SITUATION_STORIES[descKey]);
  const rawChoices  = BASE_CHOICES[event ?? 'default'] ?? BASE_CHOICES.default;
  const choices: Choice[] = rawChoices.map(c => ({
    ...c,
    baseRequired: Math.max(1, c.baseRequired + diffMod),
  }));

  return { event, description, choices };
}

/**
 * Generate the OUTCOME of the player's chosen action against the current situation.
 * The story reflects BOTH what happened AND how well the player did.
 */
export function generateOutcome(
  choiceType: ChoiceType,
  eventType: DungeonEvent['event'],
  effectiveRoll: number,
  requiredRoll: number,
  difficulty: GameRoom['difficulty'],
): DungeonEvent {
  const margin    = effectiveRoll - requiredRoll;
  const isGreat   = margin >= 6;
  const isSuccess = margin >= 0;
  const isFumble  = effectiveRoll <= 2;

  const tier: 'great' | 'success' | 'fail' | 'fumble' =
    isFumble   ? 'fumble'  :
    !isSuccess ? 'fail'    :
    isGreat    ? 'great'   : 'success';

  // Build outcome story
  const pool = OUTCOME_STORIES[choiceType]?.[tier] ?? OUTCOME_STORIES.tactical[tier];
  let rollTag: string;
  if      (effectiveRoll === 20) rollTag = 'Critical Hit!';
  else if (isFumble)             rollTag = 'Fumble!';
  else if (isGreat)              rollTag = `Great Success (+${margin})`;
  else if (isSuccess)            rollTag = `Success (+${margin})`;
  else                           rollTag = `Failed (${Math.abs(margin)} short of ${requiredRoll})`;
  let story = `${pick(pool)} [${effectiveRoll}/20 — ${rollTag}]`;

  // Damage
  const base      = { easy: 5, medium: 10, hard: 18 }[difficulty];
  const hardExtra = difficulty === 'hard' ? Math.floor(Math.random() * 8) : 0;
  let damage: number | null = null;
  let heal: number | null   = null;

  if (eventType === 'combat' || eventType === 'trap') {
    if      (tier === 'fumble')  damage = base * 2 + hardExtra;
    else if (tier === 'great')   damage = null;
    else if (tier === 'success') damage = Math.max(1, Math.floor(base * 0.3));
    else                         damage = base + Math.floor(Math.random() * 8) + hardExtra;
  }

  // Recovery heals HP; fumbling while resting still hurts
  if (choiceType === 'recovery') {
    damage = null;
    if      (tier === 'great')   heal = Math.round(base * 2.5);
    else if (tier === 'success') heal = Math.round(base * 1.2);
    else if (tier === 'fumble')  damage = Math.floor(base * 0.5);
  }

  // Loot
  const useRare = tier === 'great' || (difficulty === 'hard' && effectiveRoll >= 16);
  let item: Item | null = null;

  if (eventType === 'treasure') {
    if (tier === 'fumble') {
      // Fumble on treasure: you drop it / it's a fake, no item
      story += '\n\nThe item slips from your grasp and shatters. Nothing to show for it.';
    } else if (tier === 'fail') {
      // Fail on treasure: narrowly missed
      story += '\n\nYou cannot reach the item in time. The opportunity passes.';
    } else {
      item = generateItem(difficulty, useRare);
      story += `\n\nYou found: ${item.name} — ${item.description}.`;
    }
  }

  return { story, event: eventType, item, damage, heal, choices: [] };
}
