import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { Platform } from 'react-native';
import { Choice, ChoiceType, DungeonEvent, GameRoom, Item, Message, Player, Situation } from '../types';
import {
  generateOutcome as mockOutcome,
  generateSituation as mockSituation,
  getOpeningStory as mockOpening,
} from './mockDungeonMaster';

const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1';
const MODEL       = 'google/gemini-3-flash';

// expo/fetch enables streaming in React Native; browsers have native streaming support
const nativeFetch: typeof fetch | undefined = Platform.OS !== 'web'
  ? (require('expo/fetch') as { fetch: typeof fetch }).fetch
  : undefined;

const gatewayProvider = createOpenAI({
  baseURL: GATEWAY_URL,
  apiKey:  process.env.EXPO_PUBLIC_AI_GATEWAY_API_KEY ?? '',
  ...(nativeFetch ? { fetch: nativeFetch } : {}),
});

const geminiModel = gatewayProvider(MODEL);

export function isAIEnabled(): boolean {
  return (process.env.EXPO_PUBLIC_AI_GATEWAY_API_KEY ?? '').length > 0;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function aiChat(systemPrompt: string, userMessage: string, maxOutputTokens = 400): Promise<string> {
  const result = await generateText({
    model: geminiModel,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxOutputTokens,
    temperature: 0.9,
  });
  return result.text;
}

// Extracts visible text progress from a named JSON string field in a partial buffer
function extractFieldProgress(buf: string, field: string): string {
  const keyIdx = buf.indexOf(`"${field}"`);
  if (keyIdx === -1) return '';
  let i = keyIdx + field.length + 2;
  while (i < buf.length && buf[i] !== ':') i++;
  i++;
  while (i < buf.length && (buf[i] === ' ' || buf[i] === '\t' || buf[i] === '\n')) i++;
  if (i >= buf.length || buf[i] !== '"') return '';
  i++;
  let text = '';
  while (i < buf.length) {
    const ch = buf[i];
    if (ch === '\\' && i + 1 < buf.length) {
      const nx = buf[i + 1];
      text += nx === 'n' ? '\n' : nx === '"' ? '"' : nx === '\\' ? '\\' : nx;
      i += 2;
    } else if (ch === '"') {
      break;
    } else {
      text += ch;
      i++;
    }
  }
  return text;
}

async function aiChatStream(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  maxOutputTokens = 400,
  // 'story-json': stream only the STORY: prefix part, stop at JSON:
  // 'json-field:<name>': stream a named field from JSON (legacy)
  // undefined: stream everything
  mode?: 'story-json' | string,
): Promise<string> {
  const result = streamText({
    model: geminiModel,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    maxOutputTokens,
    temperature: 0.9,
  });

  let fullBuf = '';
  let prevLen = 0;

  for await (const chunk of result.textStream) {
    fullBuf += chunk;
    if (mode === 'story-json') {
      const jsonStart = fullBuf.search(/\n+JSON:/i);
      const visible = jsonStart >= 0 ? fullBuf.slice(0, jsonStart).replace(/^STORY:\s*/i, '').trimEnd() : fullBuf.replace(/^STORY:\s*/i, '');
      if (visible.length > prevLen) { onChunk(visible.slice(prevLen)); prevLen = visible.length; }
    } else if (mode?.startsWith('json-field:')) {
      const field = mode.slice('json-field:'.length);
      const visible = extractFieldProgress(fullBuf, field);
      if (visible.length > prevLen) { onChunk(visible.slice(prevLen)); prevLen = visible.length; }
    } else {
      onChunk(chunk);
    }
  }
  return fullBuf;
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
  generateText({
    model: geminiModel,
    messages: [{ role: 'user', content: 'hi' }],
    maxOutputTokens: 1,
  }).catch(() => {});
}

// ─── Opening ─────────────────────────────────────────────────────────────────

const DUNGEON_SETTINGS = [
  'a crumbling mountain fortress', 'a flooded underground temple', 'a cursed forest sanctum',
  'an ancient dwarven mine', 'a sea-cliff pirate stronghold', 'a frozen glacier tomb',
  'a desert pyramid', 'a volcanic obsidian citadel', 'an overgrown jungle ziggurat',
  'a plague-ravaged city undercroft', 'a sunken shipwreck on the ocean floor',
  'a crystal cavern beneath a dying city', 'an abandoned wizard tower',
  'a living forest that hunts intruders', 'a clockwork fortress of a mad inventor',
  'catacombs beneath a holy cathedral', 'a mirrored labyrinth with no visible exits',
  'a sky citadel drifting above the clouds', 'a corrupted fey court under a hollow hill',
  'a battlefield frozen in time mid-war',
];
const QUEST_HOOKS = [
  'recover a stolen artifact', 'lift an ancient curse', 'rescue captured villagers',
  'slay a creature terrorizing the region', 'uncover the truth behind a massacre',
  'retrieve a grimoire of forbidden magic', 'destroy a corrupted altar',
  'find a missing heir', 'seal a rift leaking monsters into the world',
  'free a god imprisoned beneath the earth', 'steal back a soul sold to a demon',
  'survive until dawn in a place nothing survives', 'expose a cult before the next sacrifice',
  'break a siege that has lasted a century', 'recover the last seed of an extinct world tree',
  'prevent a wedding that would end a bloodline', 'decode a prophecy before it fulfills itself',
];

const OPENING_SYSTEM = `You are a Dungeon Master. Write a unique opening (2-3 sentences) for a dungeon run. Mention the player by name and class. Be specific about the setting and quest given. Be vivid and varied — avoid clichés like "biting wind". Return ONLY plain text, no JSON, no markdown.`;

export async function getDMOpening(
  player: Player,
  difficulty: GameRoom['difficulty'],
  onChunk?: (text: string) => void,
): Promise<string> {
  if (!isAIEnabled()) return mockOpening(player, difficulty);

  const setting = DUNGEON_SETTINGS[Math.floor(Math.random() * DUNGEON_SETTINGS.length)];
  const quest   = QUEST_HOOKS[Math.floor(Math.random() * QUEST_HOOKS.length)];
  const userMsg = `Player: ${player.name} (${player.class})\nDifficulty: ${difficulty}\nSetting: ${setting}\nQuest: ${quest}\nWrite the opening now.`;

  try {
    if (onChunk) return await aiChatStream(OPENING_SYSTEM, userMsg, onChunk, 150);
    return await aiChat(OPENING_SYSTEM, userMsg, 150);
  } catch (e) {
    console.warn('[DM] opening failed, using mock:', e);
    return mockOpening(player, difficulty);
  }
}

// ─── Situation ────────────────────────────────────────────────────────────────

const SITUATION_SYSTEM = `You are a reactive Dungeon Master for DungeonQuest. Your response has TWO parts — write them in order:

PART 1 — STORY (plain text, no JSON):
Write 3-4 vivid, atmospheric sentences. For an OPENING scene: establish the specific setting, player name/class, quest, and the immediate danger/scene they walk into. For continuation scenes: the FIRST sentence must continue exactly where the last outcome left off — no hard cut, no time skip. Following sentences: consequences unfold naturally. NEVER repeat any text from story history.

PART 2 — JSON (structured data only):
{"event": "combat"|"treasure"|"trap"|"mystery"|"merchant"|null, "choices": [{"text": "max 6 words", "type": "combat"|"tactical"|"social"|"risky"|"recovery", "baseRequired": 5}], "environmental_damage": {"type": "poison"|"burning"|"cold", "magnitude": 4}|null, "merchant_inventory": [{"name": "...", "description": "...", "effect": "rollBonus"|"attackBoost"|"armorBoost"|"healBoost"|"fireResistance"|"poisonResistance"|"learnSkill"|"manaRestore", "power": 1, "price": 25, "skill_data": null}]|null}

FORMAT — your response must look exactly like this:
STORY: [your 3-4 sentences here]
JSON: {"event": ..., "choices": [...], "environmental_damage": ..., "merchant_inventory": ...}

Rules:
- null event (quiet exploration) ~30% of the time
- Combat/trap events max ~35% total
- merchant ~10%: fits the setting. When merchant: merchant_inventory has 3-4 items including at least one healBoost and one manaRestore. Choices: ["Browse wares", "Ask about the dungeon", "Leave"].
- Exactly 3 choices, natural for this moment
- baseRequired: aggressive = 12-15, careful/defensive = 5-9
- easy: petty threats; medium: real danger; hard: lethal legendary creatures
- environmental_damage only for genuinely hazardous environments (lava, poison gas, ice cavern)
- merchant_inventory null unless event="merchant". Prices: potions 10-25g, passive 30-60g, skill scrolls 80-150g.`;

interface SituationRaw {
  event: DungeonEvent['event'];
  description?: string;
  choices: Array<{ text: string; type: ChoiceType; baseRequired: number }>;
  environmental_damage: { type: 'poison' | 'burning' | 'cold'; magnitude: number } | null;
  merchant_inventory: Array<{
    name: string; description: string; effect: Item['effect']; power: number; price: number;
    skill_data?: { name: string; description: string; type: ChoiceType; base_required: number } | null;
  }> | null;
}

export async function getDMSituation(
  difficulty: GameRoom['difficulty'],
  prevChoiceType: ChoiceType | null,
  recentHistory: Message[],
  playerClass: Player['class'],
  onChunk?: (text: string) => void,
  openingPlayer?: Player,
): Promise<Situation> {
  if (!isAIEnabled()) return mockSituation(difficulty, prevChoiceType, playerClass);

  let userMsg: string;

  if (openingPlayer) {
    const setting = DUNGEON_SETTINGS[Math.floor(Math.random() * DUNGEON_SETTINGS.length)];
    const quest   = QUEST_HOOKS[Math.floor(Math.random() * QUEST_HOOKS.length)];
    userMsg = [
      `Player: ${openingPlayer.name} (${openingPlayer.class})`,
      `Difficulty: ${difficulty}`,
      `Setting: ${setting}`,
      `Quest: ${quest}`,
      'OPENING SCENE — write 4 long, vivid sentences in the STORY: section of your response, like this example: "Kira the mage steps into the flooded undercroft beneath the Cathedral of Vorn, her robes already soaked to the knee as brackish water laps at the crumbling stone columns around her. She has come to seal the Rift of Unmaking — a tear in reality that has been vomiting undead into the city above for three nights straight. The air reeks of salt and rot, and every surface glitters with a thin crust of pale crystal that hums faintly, resonating with the arcane energy leaking from somewhere deeper in the ruin. At the far end of the flooded nave a silhouette stands motionless in the water, facing away from her — too still to be alive, too upright to be a corpse." Match this length and vivid detail, using the actual player name, class, setting and quest.',
    ].join('\n');
  } else {
    const nonSystem   = recentHistory.filter(m => m.role !== 'system' && m.role !== 'chaos');
    const assistants  = nonSystem.filter(m => m.role === 'assistant');
    const lastOutcome = assistants[assistants.length - 1]?.content ?? null;
    const prevSituation = assistants[assistants.length - 2]?.content ?? null;
    const lastAction  = [...nonSystem].reverse().find(m => m.role === 'user')?.content ?? null;

    // Extract first sentence of previous situation to ban the model from reusing it
    const forbiddenOpening = prevSituation
      ? prevSituation.split(/[.!?]/)[0].trim()
      : null;

    userMsg = [
      `Difficulty: ${difficulty}`,
      `Player class: ${playerClass}`,
      lastAction  ? `LAST PLAYER ACTION: "${lastAction}"` : '',
      lastOutcome ? `WHAT JUST HAPPENED: "${lastOutcome}"` : '',
      forbiddenOpening ? `FORBIDDEN: Do NOT start your STORY: section with "${forbiddenOpening}" or anything similar.` : '',
      'Write the next scene. Your STORY: section MUST be 3 complete, atmospheric sentences (minimum 60 words). Continue directly from what just happened. Do not reuse any phrasing from above.',
    ].filter(Boolean).join('\n\n');
  }

  try {
    const raw  = onChunk
      ? await aiChatStream(SITUATION_SYSTEM, userMsg, onChunk, 800, 'story-json')
      : await aiChat(SITUATION_SYSTEM, userMsg, 800);

    // Parse STORY: / JSON: format
    const storyMatch = raw.match(/STORY:\s*([\s\S]*?)(?=\n+JSON:)/i);
    const description = storyMatch?.[1]?.trim() ?? '';

    // Extract JSON robustly — handles optional markdown code fences Gemini adds
    const jsonSectionIdx = raw.search(/JSON:/i);
    let data: SituationRaw | null = null;
    if (jsonSectionIdx >= 0) {
      const afterJson = raw.slice(jsonSectionIdx + 5)
        .replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const braceStart = afterJson.indexOf('{');
      const braceEnd   = afterJson.lastIndexOf('}');
      if (braceStart >= 0 && braceEnd > braceStart) {
        data = parseJSON<SituationRaw>(afterJson.slice(braceStart, braceEnd + 1));
      }
    }

    if (!description || !data || !Array.isArray(data.choices)) {
      console.warn('[DM] situation bad shape, raw:', raw?.slice(0, 300));
      throw new Error('bad shape');
    }

    const choices: Choice[] = data.choices.slice(0, 3).map(c => ({
      text:         String(c.text ?? 'Act'),
      type:         (c.type as ChoiceType) ?? 'tactical',
      baseRequired: Number(c.baseRequired ?? 10),
    }));

    const environmentalDamage = data.environmental_damage?.type
      ? { type: data.environmental_damage.type, magnitude: Number(data.environmental_damage.magnitude ?? 4) }
      : null;

    const merchantInventory = Array.isArray(data.merchant_inventory)
      ? data.merchant_inventory.map(mi => ({
          price: Number(mi.price ?? 20),
          item: {
            id:          `shop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name:        String(mi.name ?? 'Unknown Item'),
            description: String(mi.description ?? ''),
            effect:      (mi.effect ?? 'rollBonus') as Item['effect'],
            power:       Number(mi.power ?? 1),
            ...(mi.skill_data ? {
              skillData: {
                name:         mi.skill_data.name,
                description:  mi.skill_data.description,
                type:         (mi.skill_data.type as ChoiceType) ?? 'tactical',
                baseRequired: Number(mi.skill_data.base_required ?? 10),
              },
            } : {}),
          } as import('../types').Item,
        }))
      : null;

    return { event: data.event ?? null, description, choices, environmentalDamage, merchantInventory };
  } catch (e) {
    console.warn('[DM] situation failed, using mock:', e);
    return mockSituation(difficulty, prevChoiceType);
  }
}

// ─── Outcome ─────────────────────────────────────────────────────────────────

const OUTCOME_SYSTEM = `You are a Dungeon Master for DungeonQuest. The player chose a specific action and rolled dice. Your story must directly describe the result of THAT specific action — not something generic. If they searched for a counter-toxin, tell them exactly what happened when they searched. If they dodged, describe the dodge. Make the player feel their choice mattered.
Return ONLY valid JSON, no markdown, no extra text:
{
  "story": "2-3 sentences describing what happened, reflecting roll success/failure",
  "damage": number | null,
  "heal": number | null,
  "gold": number | null,
  "item": {"name": "...", "description": "effect summary", "effect": "rollBonus"|"attackBoost"|"armorBoost"|"healBoost"|"fireResistance"|"poisonResistance"|"learnSkill"|"manaRestore", "power": 1, "skill_data": {"name": "...", "description": "...", "type": "combat"|"tactical"|"social"|"risky"|"recovery", "base_required": 9} | null} | null,
  "chaos_story": "string | null",
  "quest_complete": boolean,
  "apply_effect": {"type": "poison"|"burning"|"paralysis"|"blessed"|"strengthened", "duration": 2, "magnitude": 5} | null
}
Rules:
- damage: null on great success; small on success (~30% of base); full on fail; double on fumble
- base damage: easy=5, medium=10, hard=18
- Difficulty sets the THREAT TYPE, not just numbers. easy=rats and bandits, medium=ogres and cursed traps, hard=ancient dragons and reality-bending horrors. Name the specific creature or trap in your story.
- heal: only if action type is "recovery" AND succeeded (heal = 10-25)
- item: only if event="treasure" AND roll succeeded; power 1-2 common, 3-5 on great success
  · For skill scrolls: effect="learnSkill", include skill_data with a unique ability fitting the scene. Rare (great success only).
  · Otherwise: skill_data is null.
- If giving an item, naturally mention finding it in the story
- story must clearly reflect whether the player succeeded or failed
- chaos_story: ONLY if chaos=true in the prompt. Write 1-2 sentences of maximum absurdity — surreal, darkly funny, completely unhinged. null if chaos=false.
- If skill_used is provided: react specifically to THAT skill in THIS environment. Make it feel contextually impactful. Higher level = more dramatic effect.
- quest_complete: true ONLY when the main quest objective is fully achieved. Otherwise always false.
- gold: coins/valuables found or looted. null for most actions. Give gold when:
  · combat success: enemy drops coins → easy 5-15g, medium 15-35g, hard 30-70g
  · treasure event success: easy 10-25g, medium 25-60g, hard 50-120g
  · great success/critical: bonus gold on top. null on failure/fumble.
  Mention finding gold naturally in the story.
- apply_effect: null most of the time. Apply sparingly when the narrative clearly calls for it:
  · poison: trap/enemy attack involving toxins on fail → duration 3, magnitude 5
  · burning: fire trap, dragon breath, lava contact on fail → duration 2, magnitude 8
  · paralysis: heavy combat blow, stunning magic on fail → duration 1-2, magnitude 5
  · blessed: divine prayer/holy shrine success → duration 3, magnitude 3
  · strengthened: warrior power-up, magical enhancement → duration 2, magnitude 3`;

interface OutcomeRaw {
  story: string;
  damage: number | null;
  heal: number | null;
  gold: number | null;
  item: {
    name: string;
    description: string;
    effect: Item['effect'];
    power: number;
    skill_data?: { name: string; description: string; type: ChoiceType; base_required: number } | null;
  } | null;
  chaos_story: string | null;
  quest_complete: boolean;
  apply_effect: { type: string; duration: number; magnitude: number } | null;
}

export async function getDMOutcome(
  choiceType: ChoiceType,
  choiceText: string,
  eventType: DungeonEvent['event'],
  effectiveRoll: number,
  requiredRoll: number,
  difficulty: GameRoom['difficulty'],
  isChaos: boolean,
  inventory: Item[],
  skillUsed: { name: string; level: number; description: string } | null,
  currentScene: string | null,
  onChunk?: (text: string) => void,
): Promise<DungeonEvent> {
  if (!isAIEnabled()) return mockOutcome(choiceType, eventType, effectiveRoll, requiredRoll, difficulty);

  const margin  = effectiveRoll - requiredRoll;
  const tier    = effectiveRoll <= 2 ? 'fumble' : margin >= 6 ? 'great success' : margin >= 0 ? 'success' : 'failure';
  const rollTag = effectiveRoll === 20 ? 'Critical Hit!' : `${effectiveRoll}/20 — ${tier} (margin ${margin > 0 ? '+' : ''}${margin})`;

  const heldItems = inventory.map(i => i.name).join(', ') || 'none';
  const userMsg = [
    `Action type: ${choiceType}`,
    `Player chose: "${choiceText}"`,
    skillUsed ? `skill_used: ${skillUsed.name} (Level ${skillUsed.level}) — ${skillUsed.description}` : 'skill_used: none',
    currentScene ? `CURRENT SCENE: ${currentScene}` : '',
    `Event: ${eventType ?? 'quiet room'}`,
    `Roll result: ${rollTag}`,
    `Required roll: ${requiredRoll}+`,
    `Difficulty: ${difficulty}`,
    `chaos: ${isChaos}`,
    `Player already owns: ${heldItems} — if generating an item, use a completely different name.`,
    'Generate the outcome. React specifically to what is in the current scene — do not default to generic results.',
  ].filter(Boolean).join('\n');

  try {
    const raw  = onChunk
      ? await aiChatStream(OUTCOME_SYSTEM, userMsg, onChunk, 400, 'json-field:story')
      : await aiChat(OUTCOME_SYSTEM, userMsg);
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
        ...(data.item.skill_data ? {
          skillData: {
            name:         data.item.skill_data.name,
            description:  data.item.skill_data.description,
            type:         (data.item.skill_data.type as ChoiceType) ?? 'tactical',
            baseRequired: Number(data.item.skill_data.base_required ?? 10),
          },
        } : {}),
      };
    }

    const applyEffect = data.apply_effect?.type
      ? {
          id:        `eff-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type:      data.apply_effect.type as import('../types').StatusEffectType,
          duration:  Number(data.apply_effect.duration ?? 2),
          magnitude: Number(data.apply_effect.magnitude ?? 5),
        }
      : null;

    return {
      story:         data.story,
      event:         eventType,
      item,
      damage:        data.damage        ?? null,
      heal:          data.heal          ?? null,
      goldGained:    data.gold           ?? null,
      chaosStory:    data.chaos_story   ?? null,
      questComplete: data.quest_complete ?? false,
      choices:       [],
      applyEffect,
    };
  } catch (e) {
    console.warn('[DM] outcome failed, using mock:', e);
    return mockOutcome(choiceType, eventType, effectiveRoll, requiredRoll, difficulty);
  }
}
