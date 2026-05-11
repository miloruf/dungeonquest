import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Clipboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/gameContext';
import { fetchRoom, subscribeToRoom, updateRoomState } from '../services/roomService';
import { Player } from '../types';

const CLASS_ICONS: Record<Player['class'], string> = {
  warrior: '⚔️',
  mage: '🔮',
  healer: '✨',
};

export default function LobbyScreen() {
  const router = useRouter();
  const { code, host } = useLocalSearchParams<{ code: string; host: string }>();
  const { gameState, setGameState, localPlayerId } = useGame();
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const isHost   = host === 'true';
  const players  = gameState.room.players;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    Clipboard.setString(code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!code) return;
    fetchRoom(code).then(state => { if (state) setGameState(state); });
    const channel = subscribeToRoom(code, setGameState);
    return () => { channel.unsubscribe(); };
  }, [code]);

  useEffect(() => {
    if (gameState.room.status === 'playing') router.replace('/game');
  }, [gameState.room.status]);

  async function handleStart() {
    if (!code) return;
    setStarting(true);
    setError(null);
    try {
      await updateRoomState(code, { status: 'playing' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler beim Starten');
      setStarting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backText}>← Zurück</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Lobby</Text>
      </View>

      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Raum-Code</Text>
        <Text style={styles.code}>{code}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
          <Text style={styles.copyText}>{copied ? '✓ Kopiert!' : 'Code kopieren'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.playersSection}>
        <Text style={styles.sectionLabel}>Spieler ({players.length})</Text>
        {players.length === 0 && (
          <View style={styles.waitingRow}>
            <ActivityIndicator color="#6c3483" />
            <Text style={styles.waitingText}>Warte auf Spieler...</Text>
          </View>
        )}
        {players.map(p => (
          <View key={p.id} style={[styles.playerRow, p.id === localPlayerId && styles.playerRowMe]}>
            <Text style={styles.playerIcon}>{CLASS_ICONS[p.class]}</Text>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>
                {p.name}{p.id === localPlayerId ? ' (Du)' : ''}
              </Text>
              <Text style={styles.playerClass}>{p.class} · {p.maxHp} HP</Text>
            </View>
            {p.id === gameState.room.currentTurn && (
              <Text style={styles.hostBadge}>Host</Text>
            )}
          </View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.footer}>
        {isHost ? (
          <TouchableOpacity
            style={[styles.startBtn, (players.length < 1 || starting) && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={players.length < 1 || starting}
            activeOpacity={0.8}
          >
            {starting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.startBtnText}>Spiel starten ({players.length} Spieler)</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingRow}>
            <ActivityIndicator color="#6c3483" />
            <Text style={styles.waitingText}>Warte auf den Host...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0d0a1a', padding: 16 },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn:          { padding: 4 },
  backText:         { color: '#a29bfe', fontSize: 14 },
  title:            { color: '#f4d03f', fontSize: 20, fontWeight: '800' },
  codeBox:          { backgroundColor: '#1e0f3a', borderRadius: 14, borderWidth: 1, borderColor: '#6c3483', padding: 20, alignItems: 'center', marginBottom: 20 },
  codeLabel:        { color: '#6c5a8e', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  code:             { color: '#f4d03f', fontSize: 36, fontWeight: '900', letterSpacing: 8 },
  copyBtn:          { marginTop: 10, backgroundColor: '#2a1550', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7, borderWidth: 1, borderColor: '#6c3483' },
  copyText:         { color: '#a29bfe', fontSize: 12, fontWeight: '600' },
  playersSection:   { flex: 1, gap: 8 },
  sectionLabel:     { color: '#a29bfe', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  waitingRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, justifyContent: 'center' },
  waitingText:      { color: '#4a3a6a', fontSize: 14, fontStyle: 'italic' },
  playerRow:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e0f3a', borderRadius: 10, borderWidth: 1, borderColor: '#3d1f6b', padding: 12, gap: 12 },
  playerRowMe:      { borderColor: '#c9a227' },
  playerIcon:       { fontSize: 24 },
  playerInfo:       { flex: 1 },
  playerName:       { color: '#f4d03f', fontSize: 15, fontWeight: '700' },
  playerClass:      { color: '#a29bfe', fontSize: 11, marginTop: 2 },
  hostBadge:        { color: '#c9a227', fontSize: 11, fontWeight: '700', backgroundColor: '#2a1550', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  footer:           { paddingTop: 12 },
  error:            { color: '#e74c3c', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  startBtn:         { backgroundColor: '#6c3483', borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
