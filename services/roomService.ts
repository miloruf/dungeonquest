import { RealtimeChannel } from '@supabase/supabase-js';
import { GameState, Player, Situation } from '../types';
import { supabase } from './supabase';

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function parseSituation(raw: unknown): Situation | null {
  if (!raw || typeof raw !== 'string') return null;
  try { return JSON.parse(raw) as Situation; } catch { return null; }
}

export async function createRoom(
  host: Player,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<string> {
  const roomCode = generateRoomCode();

  const { error } = await supabase.from('rooms').insert({
    room_code: roomCode,
    players: [host],
    status: 'waiting',
    current_turn: host.id,
    difficulty,
    current_scene: 'start',
    story_history: [],
    last_event: null,
    dice_result: null,
  });

  if (error) throw new Error(`Failed to create room: ${error.message}`);
  return roomCode;
}

export async function joinRoom(roomCode: string, player: Player): Promise<void> {
  const { data, error } = await supabase
    .from('rooms')
    .select('players, status')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error || !data) throw new Error('Room not found');
  if (data.status !== 'waiting') throw new Error('Game already started');

  const players = [...(data.players as Player[]), player];

  const { error: updateError } = await supabase
    .from('rooms')
    .update({ players })
    .eq('room_code', roomCode.toUpperCase());

  if (updateError) throw new Error(`Failed to join room: ${updateError.message}`);
}

export async function fetchRoom(roomCode: string): Promise<GameState | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error || !data) return null;

  return {
    room: {
      roomCode: data.room_code,
      players: data.players,
      status: data.status,
      currentTurn: data.current_turn,
      difficulty: data.difficulty,
    },
    storyHistory: data.story_history ?? [],
    currentScene: '',
    currentSituation: parseSituation(data.current_scene),
    lastEvent: data.last_event,
    diceResult: data.dice_result,
  };
}

export async function updateRoomState(
  roomCode: string,
  patch: Partial<{
    players: Player[];
    status: string;
    currentTurn: string;
    currentSituation: Situation | null;
    storyHistory: GameState['storyHistory'];
    lastEvent: GameState['lastEvent'];
    diceResult: number | null;
  }>
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.players !== undefined)         dbPatch.players       = patch.players;
  if (patch.status !== undefined)          dbPatch.status        = patch.status;
  if (patch.currentTurn !== undefined)     dbPatch.current_turn  = patch.currentTurn;
  if (patch.currentSituation !== undefined)
    dbPatch.current_scene = patch.currentSituation ? JSON.stringify(patch.currentSituation) : null;
  if (patch.storyHistory !== undefined)    dbPatch.story_history = patch.storyHistory;
  if (patch.lastEvent !== undefined)       dbPatch.last_event    = patch.lastEvent;
  if (patch.diceResult !== undefined)      dbPatch.dice_result   = patch.diceResult;

  const { error } = await supabase
    .from('rooms')
    .update(dbPatch)
    .eq('room_code', roomCode.toUpperCase());

  if (error) throw new Error(`Failed to update room: ${error.message}`);
}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (state: GameState) => void
): RealtimeChannel {
  return supabase
    .channel(`room:${roomCode}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` },
      (payload) => {
        const d = payload.new as Record<string, unknown>;
        onUpdate({
          room: {
            roomCode: d.room_code as string,
            players: d.players as Player[],
            status: d.status as GameState['room']['status'],
            currentTurn: d.current_turn as string,
            difficulty: d.difficulty as GameState['room']['difficulty'],
          },
          storyHistory: (d.story_history as GameState['storyHistory']) ?? [],
          currentScene: '',
          currentSituation: parseSituation(d.current_scene),
          lastEvent: d.last_event as GameState['lastEvent'],
          diceResult: d.dice_result as number | null,
        });
      }
    )
    .subscribe();
}
