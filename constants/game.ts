import { Item, Player, Skill, StatusEffectType } from '../types';

export const STATUS_CONFIG: Record<StatusEffectType, { icon: string; color: string; apply: string; expire: string }> = {
  poison:      { icon: '☠️', color: '#27ae60', apply: '☠️ Poisoned!',    expire: '☠️ Poison fades.' },
  burning:     { icon: '🔥', color: '#e67e22', apply: '🔥 Burning!',      expire: '🔥 Fire out.' },
  paralysis:   { icon: '⚡', color: '#8e44ad', apply: '⚡ Paralyzed!',    expire: '⚡ Paralysis lifts.' },
  blessed:     { icon: '✨', color: '#f4d03f', apply: '✨ Blessed!',       expire: '✨ Blessing fades.' },
  strengthened:{ icon: '💪', color: '#e74c3c', apply: '💪 Strengthened!', expire: '💪 Strength fades.' },
};

export const CLASS_HP: Record<Player['class'], number> = {
  warrior: 120,
  mage:    80,
  healer:  100,
};

export const CLASS_MANA: Record<Player['class'], number> = {
  warrior: 60,
  mage:    120,
  healer:  80,
};

export const STARTING_SKILLS: Record<Player['class'], Omit<Skill, 'id'>> = {
  warrior: { name: 'Cleave',     description: 'A powerful horizontal slash that hits everything in arc', type: 'combat',   baseRequired: 10, manaCost: 15, level: 1, useCount: 0 },
  mage:    { name: 'Fireball',   description: 'Hurl a ball of arcane fire that explodes on impact',      type: 'risky',    baseRequired: 11, manaCost: 30, level: 1, useCount: 0 },
  healer:  { name: 'Holy Light', description: 'Channel divine energy to heal and blind undead',          type: 'recovery', baseRequired: 7,  manaCost: 20, level: 1, useCount: 0 },
};

export function makePlayer(name: string, cls: Player['class']): Player {
  const hp   = CLASS_HP[cls];
  const mana = CLASS_MANA[cls];
  const sk   = STARTING_SKILLS[cls];
  return {
    id:           `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name:         name.trim(),
    class:        cls,
    hp,
    maxHp:        hp,
    mana,
    maxMana:      mana,
    gold:         0,
    inventory:    [],
    activeEffects:[],
    skills:       [{ ...sk, id: 'skill-1' }],
  };
}

export const EFFECT_ICONS: Record<Item['effect'], string> = {
  rollBonus:        '🎲',
  attackBoost:      '⚔️',
  armorBoost:       '🛡️',
  healBoost:        '💚',
  fireResistance:   '🔥',
  poisonResistance: '☠️',
  learnSkill:       '📜',
  manaRestore:      '💧',
};

export const CONSUMABLE_EFFECTS: Set<Item['effect']> = new Set([
  'healBoost', 'poisonResistance', 'fireResistance', 'learnSkill', 'manaRestore',
]);

export function sellPrice(item: { power: number }): number {
  return Math.max(5, item.power * 8);
}
