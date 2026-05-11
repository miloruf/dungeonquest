import { Choice, ChoiceType, DungeonEvent, GameRoom, Item, Message, Player, Situation } from '../types';
import {
  generateOutcome as mockOutcome,
  generateSituation as mockSituation,
  getOpeningStory as mockOpening,
} from './mockDungeonMaster';

const OLLAMA_BASE = (process.env.EXPO_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434').trim();
const OLLAMA_URL  = `${OLLAMA_BASE}/v1/chat/completions`;
const MODEL       = 'gemma3:12b';

export function isAIEnabled(): boolean {
  return (process.env.EXPO_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434').trim().length > 0;
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────

async function aiChat(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function parseJSON<T>(raw: string): T | null {
  try {
    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ─── Warm-up ─────────────────────────────────────────────────────────────────

export function warmUpModel(): void {
  if (!isAIEnabled()) return;
  fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
  }).catch(() => {});
}

// ─── Opening ─────────────────────────────────────────────────────────────────

const OPENING_SYSTEM = `You are a Dungeon Master. Write a unique, atmospheric opening paragraph (2-3 sentences) for a new dungeon run. Mention the player's name and class. Set up a compelling reason to enter the dungeon. Keep it dramatic. Return ONLY the plain text, no JSON, no markdown.`;

export async function getDMOpening(
  player: Player,
  difficulty: GameRoom['difficulty'],
): Promise<string> {
  if (!isAIEnabled()) return mockOpening(player, difficulty);

  const userMsg = `Player name: ${player.name}\nClass: ${player.class}\nDifficulty: ${difficulty}\nWrite the opening.`;

  try {
    return await aiChat(OPENING_SYSTEM, userMsg);
  } catch (e) {
    console.warn('[DM] OpenRouter opening failed, using mock:', e);
    return mockOpening(player, difficulty);
  }
}

// ─── Situation ────────────────────────────────────────────────────────────────

const SITUATION_SYSTEM = `You are a Dungeon Master for DungeonQuest, a D&D-inspired mobile game.
Generate the next encounter for the player. Return ONLY valid JSON, no markdown, no extra text:
{
  "event": "combat" | "treasure" | "trap" | "mystery" | null,
  "description": "2-3 sentences vividly describing what the player encounters",
  "choices": [
    {"text": "short action (max 6 words)", "type": "combat"|"tactical"|"social"|"risky"|"recovery", "baseRequired": 5}
  ]
}
Rules:
- Always provide exactly 3 choices
- baseRequired reflects how hard that specific action is given THIS situation:
  - Aggressive/risky actions (charge, attack, force) vs a dangerous enemy: high (12-16)
  - Careful/defensive actions (observe, dodge, retreat): lower (5-9)
  - Vary them so choices have meaningfully different difficulty
  - Overall range by difficulty: easy 5-11, medium 7-14, hard 10-17
- null event means a quiet/rest room
- Keep tone dramatic and atmospheric`;

interface SituationRaw {
  event: DungeonEvent['event'];
  description: string;
  choices: Array<{ text: string; type: ChoiceType; baseRequired: number }>;
}

export async function getDMSituation(
  difficulty: GameRoom['difficulty'],
  prevChoiceType: ChoiceType | null,
  recentHistory: Message[],
): Promise<Situation> {
  if (!isAIEnabled()) return mockSituation(difficulty, prevChoiceType);

  const context = recentHistory
    .filter(m => m.role === 'assistant')
    .slice(-2)
    .map(m => m.content)
    .join('\n');

  const userMsg = [
    `Difficulty: ${difficulty}`,
    prevChoiceType ? `Previous player action type: ${prevChoiceType}` : 'This is the first encounter',
    context ? `Recent story:\n${context}` : '',
    'Generate the next encounter.',
  ].filter(Boolean).join('\n');

  try {
    const raw  = await aiChat(SITUATION_SYSTEM, userMsg);
    const data = parseJSON<SituationRaw>(raw);
    if (!data || !data.description || !Array.isArray(data.choices)) throw new Error('bad shape');

    const choices: Choice[] = data.choices.slice(0, 3).map(c => ({
      text:         String(c.text ?? 'Act'),
      type:         (c.type as ChoiceType) ?? 'tactical',
      baseRequired: Number(c.baseRequired ?? 10),
    }));

    return { event: data.event ?? null, description: data.description, choices };
  } catch (e) {
    console.warn('[DM] OpenRouter situation failed, using mock:', e);
    return mockSituation(difficulty, prevChoiceType);
  }
}

// ─── Outcome ─────────────────────────────────────────────────────────────────

const OUTCOME_SYSTEM = `You are a Dungeon Master for DungeonQuest. The player took an action and rolled dice.
Return ONLY valid JSON, no markdown, no extra text:
{
  "story": "2-3 sentences describing what happened, reflecting roll success/failure",
  "damage": number | null,
  "heal": number | null,
  "item": {"name": "...", "description": "effect summary", "effect": "rollBonus"|"attackBoost"|"armorBoost"|"healBoost"|"fireResistance"|"poisonResistance", "power": 1} | null
}
Rules:
- damage: null on great success; small on success (~30% of base); full on fail; double on fumble
- base damage: easy=5, medium=10, hard=18
- heal: only if action type is "recovery" AND succeeded (heal = 10-25)
- item: only if event="treasure" AND roll succeeded; power 1-2 common, 3-5 on great success
- If giving an item, naturally mention finding it in the story
- story must clearly reflect whether the player succeeded or failed`;

interface OutcomeRaw {
  story: string;
  damage: number | null;
  heal: number | null;
  item: { name: string; description: string; effect: Item['effect']; power: number } | null;
}

export async function getDMOutcome(
  choiceType: ChoiceType,
  choiceText: string,
  eventType: DungeonEvent['event'],
  effectiveRoll: number,
  requiredRoll: number,
  difficulty: GameRoom['difficulty'],
): Promise<DungeonEvent> {
  if (!isAIEnabled()) return mockOutcome(choiceType, eventType, effectiveRoll, requiredRoll, difficulty);

  const margin  = effectiveRoll - requiredRoll;
  const tier    = effectiveRoll <= 2 ? 'fumble' : margin >= 6 ? 'great success' : margin >= 0 ? 'success' : 'failure';
  const rollTag = effectiveRoll === 20 ? 'Critical Hit!' : `${effectiveRoll}/20 — ${tier} (margin ${margin > 0 ? '+' : ''}${margin})`;

  const userMsg = [
    `Action type: ${choiceType}`,
    `Player chose: "${choiceText}"`,
    `Event: ${eventType ?? 'quiet room'}`,
    `Roll result: ${rollTag}`,
    `Required roll: ${requiredRoll}+`,
    `Difficulty: ${difficulty}`,
    'Generate the outcome.',
  ].join('\n');

  try {
    const raw  = await aiChat(OUTCOME_SYSTEM, userMsg);
    const data = parseJSON<OutcomeRaw>(raw);
    if (!data || !data.story) throw new Error('bad shape');

    let item: Item | null = null;
    if (data.item && data.item.name) {
      item = {
        id:          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name:        data.item.name,
        description: data.item.description ?? '',
        effect:      data.item.effect ?? 'rollBonus',
        power:       Number(data.item.power ?? 1),
      };
    }

    // Append roll tag to story for consistency with mock DM
    const story = `${data.story} [${rollTag}]`;

    return {
      story,
      event:   eventType,
      item,
      damage:  data.damage ?? null,
      heal:    data.heal   ?? null,
      choices: [],
    };
  } catch (e) {
    console.warn('[DM] OpenRouter outcome failed, using mock:', e);
    return mockOutcome(choiceType, eventType, effectiveRoll, requiredRoll, difficulty);
  }
}
