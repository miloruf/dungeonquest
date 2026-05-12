import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClassSelector from '../components/ClassSelector';
import { makePlayer } from '../constants/game';
import { useGame } from '../context/gameContext';
import { createRoom, joinRoom } from '../services/roomService';
import { Player } from '../types';

type Mode = 'create' | 'join';
type Difficulty = 'easy' | 'medium' | 'hard';

const DIFF_LABELS: Record<Difficulty, string> = { easy: 'Leicht', medium: 'Mittel', hard: 'Schwer' };

export default function RoomScreen() {
  const router = useRouter();
  const { setGameState, setLocalPlayerId } = useGame();

  const [mode, setMode]           = useState<Mode>('create');
  const [name, setName]           = useState('');
  const [cls, setCls]             = useState<Player['class'] | null>(null);
  const [difficulty, setDiff]     = useState<Difficulty>('medium');
  const [roomCode, setRoomCode]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const canProceed = name.trim().length > 0 && cls !== null
    && (mode === 'create' || roomCode.trim().length >= 4);

  async function handleCreate() {
    if (!cls) return;
    setLoading(true);
    setError(null);
    try {
      const player = makePlayer(name, cls);
      const code   = await createRoom(player, difficulty);
      setLocalPlayerId(player.id);
      setGameState({
        room: { roomCode: code, players: [player], status: 'waiting', currentTurn: player.id, difficulty },
        storyHistory: [],
        currentScene: '',
        currentSituation: null,
        lastEvent: null,
        diceResult: null,
      });
      router.push(`/lobby?code=${code}&host=true`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Erstellen');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!cls) return;
    setLoading(true);
    setError(null);
    try {
      const player = makePlayer(name, cls);
      await joinRoom(roomCode.trim(), player);
      setLocalPlayerId(player.id);
      router.push(`/lobby?code=${roomCode.trim().toUpperCase()}&host=false`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Raum nicht gefunden oder Spiel läuft bereits');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backText}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Multiplayer</Text>
      </View>

      <View style={styles.tabs}>
        {(['create', 'join'] as Mode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.tab, mode === m && styles.tabActive]}
            onPress={() => { setMode(m); setError(null); }}
          >
            <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
              {m === 'create' ? 'Raum erstellen' : 'Beitreten'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Dein Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Held-Name..."
          placeholderTextColor="#4a3a6a"
          value={name}
          onChangeText={setName}
          maxLength={20}
        />

        <Text style={styles.label}>Klasse</Text>
        <ClassSelector selected={cls} onSelect={setCls} />

        {mode === 'create' && (
          <>
            <Text style={styles.label}>Schwierigkeit</Text>
            <View style={styles.diffRow}>
              {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]}
                  onPress={() => setDiff(d)}
                >
                  <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>
                    {DIFF_LABELS[d]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {mode === 'join' && (
          <>
            <Text style={styles.label}>Raum-Code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="XXXXXX"
              placeholderTextColor="#4a3a6a"
              value={roomCode}
              onChangeText={v => setRoomCode(v.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.actionBtn, (!canProceed || loading) && styles.actionBtnDisabled]}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={!canProceed || loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.actionBtnText}>
                {mode === 'create' ? 'Raum erstellen' : 'Beitreten'}
              </Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: '#0d0a1a' },
  header:            { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn:           { padding: 4 },
  backText:          { color: '#a29bfe', fontSize: 14 },
  title:             { color: '#f4d03f', fontSize: 20, fontWeight: '800' },
  tabs:              { flexDirection: 'row', marginHorizontal: 16, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#3d1f6b' },
  tab:               { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#1e0f3a' },
  tabActive:         { backgroundColor: '#6c3483' },
  tabText:           { color: '#6c5a8e', fontWeight: '600', fontSize: 14 },
  tabTextActive:     { color: '#fff' },
  form:              { padding: 16, gap: 14 },
  label:             { color: '#a29bfe', fontSize: 12, fontWeight: '600' },
  input:             { backgroundColor: '#1e0f3a', borderRadius: 10, borderWidth: 1, borderColor: '#3d1f6b', color: '#f4d03f', fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  codeInput:         { textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: '800' },
  diffRow:           { flexDirection: 'row', gap: 8 },
  diffBtn:           { flex: 1, backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#3d1f6b', paddingVertical: 10, alignItems: 'center' },
  diffBtnActive:     { borderColor: '#c9a227', backgroundColor: '#2a1550' },
  diffText:          { color: '#6c5a8e', fontSize: 13, fontWeight: '600' },
  diffTextActive:    { color: '#c9a227' },
  error:             { color: '#e74c3c', fontSize: 13, textAlign: 'center' },
  actionBtn:         { backgroundColor: '#6c3483', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
