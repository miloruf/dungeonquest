import { DungeonEvent, GameState } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';
const API_VERSION = '2023-06-01';

const SYSTEM_PROMPT = `You are a Dungeon Master for a D&D-inspired mobile game called DungeonQuest.
Your responses MUST be valid JSON matching this exact structure — no extra text, no markdown:
{
  "story": "string (2-3 sentences describing what happens)",
  "event": "combat" | "treasure" | "trap" | "mystery" | null,
  "item": { "id": "string", "name": "string", "description": "string", "effect": "fireResistance"|"poisonResistance"|"attackBoost"|"healBoost"|"armorBoost", "power": number } | null,
  "damage": number | null,
  "choices": ["choice1", "choice2", "choice3"]
}
Keep the tone dramatic and immersive. Difficulty should reflect the game's current difficulty setting.`;

export async function getDungeonMasterResponse(
  playerAction: string,
  diceResult: number,
  gameState: GameState,
  apiKey: string
): Promise<DungeonEvent> {
  const userMessage = `Player action: "${playerAction}"\nDice roll: ${diceResult}/20\nDifficulty: ${gameState.room.difficulty}\nCurrent scene: ${gameState.currentScene}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        ...gameState.storyHistory,
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text ?? '{}';
  return JSON.parse(content) as DungeonEvent;
}
