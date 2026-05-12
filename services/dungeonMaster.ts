import { Choice, ChoiceType, DungeonEvent, GameRoom, Item, Message, Player, Situation } from '../types';
import {
  generateOutcome as mockOutcome,
  generateSituation as mockSituation,
  getOpeningStory as mockOpening,
} from './mockDungeonMaster';

const OLLAMA_BASE = (process.env.EXPO_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434').trim();
const OLLAMA_URL  = `${OLLAMA_BASE}/v1/chat/completions`;
const MODEL       = 'gemma3n:e4b';

export function isAIEnabled(): boolean {
  return (process.env.EXPO_PUBLIC_OLLAMA_URL ?? 'http://localhost:11434').trim().length > 0;
}

// ─── Shared fetch helpers ────────────────────────────────────────────────────

async function aiChat(systemPrompt: string, userMessage: string, maxTokens = 400): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.9,
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

// Extracts visible text progress from a named JSON string field in a partial buffer
function extractFieldProgress(buf: string, field: string): string {
  const keyIdx = buf.indexOf(`"${field}"`);
  if (keyIdx === -1) return '';
  // Skip past key, colon, optional whitespace, then opening quote
  let i = keyIdx + field.length + 2; // past closing " of key
  while (i < buf.length && buf[i] !== ':') i++;
  i++; // skip ':'
  while (i < buf.length && (buf[i] === ' ' || buf[i] === '\t' || buf[i] === '\n')) i++;
  if (i >= buf.length || buf[i] !== '"') return '';
  i++; // skip opening quote
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

// Streams a response; if jsonField is set, only calls onChunk with text from that JSON field
async function aiChatStream(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  maxTokens = 400,
  jsonField?: string,
): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      temperature: 0.9,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);

  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullBuf   = '';
  let lineBuf   = '';
  let prevLen   = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    lineBuf += decoder.decode(value, { stream: true });
    const lines = lineBuf.split('\n');
    lineBuf = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') break;
      try {
        const token = JSON.parse(data).choices?.[0]?.delta?.content ?? '';
        if (!token) continue;
        fullBuf += token;
        if (jsonField) {
          const visible = extractFieldProgress(fullBuf, jsonField);
          if (visible.length > prevLen) { onChunk(visible.slice(prevLen)); prevLen = visible.length; }
        } else {
          onChunk(token);
        }
      } catch { /* partial JSON line, skip */ }
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
  fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
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
    console.warn('[DM] OpenRouter opening failed, using mock:', e);
    return mockOpening(player, difficulty);
  }
}

// ─── Situation ────────────────────────────────────────────────────────────────

const SITUATION_SYSTEM = `You are a reactive Dungeon Master for DungeonQuest. Your #1 job: seamless continuity — every scene must grow out of the previous one.

STRICT TRANSITION RULE: The description's FIRST sentence must continue exactly where the last outcome left off. No scene break, no time skip, no fresh setup. The reader should not feel a cut. Only in the second or third sentence may a new development emerge — and only as a natural consequence of what just happened, not a random new event.

Bad example (hard cut): "You decipher the symbols. Suddenly a skeleton warrior leaps from the shadows."
Good example (continuous): "As the final symbol clicks into place in your mind, a deep rumble travels through the stone beneath your feet — the mechanism the carvings described is activating, and the floor begins to shift."

NEVER REPEAT text from the story history. The player already read it. Your description must contain ONLY new sentences that have never appeared before in the story.

The setting can be anything — dungeon, forest, mountain pass, swamp, ruins, city, ship, cave, temple. Stay consistent with established context.

Return ONLY valid JSON, no markdown:
{
  "event": "combat" | "treasure" | "trap" | "mystery" | null,
  "description": "2-3 NEW sentences not found anywhere in the story so far. First sentence: direct continuation of the last outcome (no cut). Following sentences: consequence unfolds naturally.",
  "choices": [
    {"text": "short action (max 6 words)", "type": "combat"|"tactical"|"social"|"risky"|"recovery", "baseRequired": 5}
  ]
}
Rules:
- null event (quiet exploration) should occur ~35% of the time: catching breath, finding a clue, eerie silence, a fork in the path, something strange but not immediately threatening
- Combat/trap events max ~40% total — not every room is a fight
- Exactly 3 choices, natural for this specific moment
- baseRequired: aggressive = 12-15, careful/defensive = 5-9 — same range regardless of difficulty
- Difficulty changes the WORLD, not the dice. Scale your encounters accordingly:
  · easy: petty threats — rabble bandits, simple locks, weak curses, scared animals
  · medium: real danger — veteran fighters, spiked pit traps, vengeful spirits, trained beasts
  · hard: lethal stakes — legendary creatures (ancient dragons, demon lords), catastrophic traps, cursed relics that fight back, horrors that bend reality
- The world has memory — reference earlier events when it makes sense`;

interface SituationRaw {
  event: DungeonEvent['event'];
  description: string;
  choices: Array<{ text: string; type: ChoiceType; baseRequired: number }>;
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
      'Write the OPENING of this adventure. Description must be 3-4 vivid sentences: sentences 1-2 establish the specific setting and quest with atmosphere and detail (mention the player by name and class), sentence 3-4 describe what the player encounters RIGHT NOW as they arrive — the immediate scene that leads to their first choice. Avoid clichés.',
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
      forbiddenOpening ? `FORBIDDEN: Do NOT start your description with "${forbiddenOpening}" or anything similar.` : '',
      'Write the next scene with 2-3 COMPLETELY NEW sentences. Continue directly from what just happened. Do not reuse any phrasing from above.',
    ].filter(Boolean).join('\n\n');
  }

  try {
    const raw  = onChunk
      ? await aiChatStream(SITUATION_SYSTEM, userMsg, onChunk, 600, 'description')
      : await aiChat(SITUATION_SYSTEM, userMsg, 600);
    const data = parseJSON<SituationRaw>(raw);
    if (!data || !data.description || !Array.isArray(data.choices)) {
      console.warn('[DM] situation bad shape, raw:', raw?.slice(0, 200));
      throw new Error('bad shape');
    }

    const choices: Choice[] = data.choices.slice(0, 3).map(c => ({
      text:         String(c.text ?? 'Act'),
      type:         (c.type as ChoiceType) ?? 'tactical',
      baseRequired: Number(c.baseRequired ?? 10),
    }));

    return { event: data.event ?? null, description: data.description, choices };
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
  "item": {"name": "...", "description": "effect summary", "effect": "rollBonus"|"attackBoost"|"armorBoost"|"healBoost"|"fireResistance"|"poisonResistance", "power": 1} | null,
  "chaos_story": "string | null",
  "quest_complete": boolean
}
Rules:
- damage: null on great success; small on success (~30% of base); full on fail; double on fumble
- base damage: easy=5, medium=10, hard=18
- Difficulty sets the THREAT TYPE, not just numbers. easy=rats and bandits, medium=ogres and cursed traps, hard=ancient dragons and reality-bending horrors. Name the specific creature or trap in your story.
- heal: only if action type is "recovery" AND succeeded (heal = 10-25)
- item: only if event="treasure" AND roll succeeded; power 1-2 common, 3-5 on great success
- If giving an item, naturally mention finding it in the story
- story must clearly reflect whether the player succeeded or failed
- chaos_story: ONLY if chaos=true in the prompt. Write 1-2 sentences of maximum absurdity — surreal, darkly funny, completely unhinged. Examples: tripping and impaling yourself on your own sword, sneezing so hard you dislocate your spine, your shoelaces transforming into angry eels, accidentally summoning a tax collector from another dimension. The more unexpected and ridiculous the better. null if chaos=false.
- If skill_used is provided: the player used their personal class skill. React specifically to THAT skill in THIS environment — Fireball in a cave might ignite gas and collapse a wall revealing a passage, Fireball against a troll might melt its regenerating flesh. Blink in a fight lets them teleport behind the enemy. Holy Light in darkness might reveal a hidden inscription. Make the skill feel meaningful and contextually impactful. Higher level = more dramatic effect.
- quest_complete: true ONLY when the main quest objective from the opening story is fully achieved (villain defeated, heir rescued, rift sealed, artifact recovered, etc.). Not for partial victories. If the quest is complete, end your story with a satisfying conclusion. Otherwise always false.`;

interface OutcomeRaw {
  story: string;
  damage: number | null;
  heal: number | null;
  item: { name: string; description: string; effect: Item['effect']; power: number } | null;
  chaos_story: string | null;
  quest_complete: boolean;
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
    `Event: ${eventType ?? 'quiet room'}`,
    `Roll result: ${rollTag}`,
    `Required roll: ${requiredRoll}+`,
    `Difficulty: ${difficulty}`,
    `chaos: ${isChaos}`,
    `Player already owns: ${heldItems} — if generating an item, use a completely different name.`,
    'Generate the outcome.',
  ].join('\n');

  try {
    const raw  = onChunk
      ? await aiChatStream(OUTCOME_SYSTEM, userMsg, onChunk, 400, 'story')
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
      };
    }

    const story = data.story;

    return {
      story,
      event:         eventType,
      item,
      damage:        data.damage        ?? null,
      heal:          data.heal          ?? null,
      chaosStory:    data.chaos_story   ?? null,
      questComplete: data.quest_complete ?? false,
      choices:       [],
    };
  } catch (e) {
    console.warn('[DM] OpenRouter outcome failed, using mock:', e);
    return mockOutcome(choiceType, eventType, effectiveRoll, requiredRoll, difficulty);
  }
}
