import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGame } from '../context/gameContext';

export default function ResultScreen() {
  const router = useRouter();
  const { won, turns } = useLocalSearchParams<{ won: string; turns: string }>();
  const { gameState, setGameState } = useGame();

  const player = gameState.room.players[0];
  const isVictory = won === 'true';
  const turnsCount = parseInt(turns ?? '0', 10);

  const handlePlayAgain = () => {
    setGameState(prev => ({ ...prev, storyHistory: [], lastEvent: null, diceResult: null }));
    router.push('/solo');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.icon}>{isVictory ? '🏆' : '💀'}</Text>
        <Text style={[styles.title, isVictory ? styles.victoryTitle : styles.defeatTitle]}>
          {isVictory ? 'Victory!' : 'Defeated...'}
        </Text>
        <Text style={styles.subtitle}>
          {isVictory
            ? 'You conquered the Dungeon of Shadows!'
            : 'The dungeon has claimed another soul.'}
        </Text>

        {player && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Adventure Summary</Text>
            <Row label="Hero"         value={player.name} />
            <Row label="Class"        value={player.class} />
            <Row label="Turns"        value={String(turnsCount)} />
            <Row
              label="HP Remaining"
              value={`${player.hp} / ${player.maxHp}`}
              valueColor={player.hp > 0 ? '#2ecc71' : '#e74c3c'}
            />
            <Row label="Items Found"  value={String(player.inventory.length)} />
          </View>
        )}

        {player && player.inventory.length > 0 && (
          <View style={[styles.card, styles.lootCard]}>
            <Text style={styles.cardTitle}>Loot Collected</Text>
            {player.inventory.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAgain} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/')} activeOpacity={0.8}>
          <Text style={styles.secondaryButtonText}>← Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0a1a' },
  scroll: { padding: 24, alignItems: 'center', gap: 16, paddingBottom: 48 },
  icon: { fontSize: 64 },
  title: { fontSize: 36, fontWeight: '900', textAlign: 'center' },
  victoryTitle: { color: '#f4d03f' },
  defeatTitle: { color: '#e74c3c' },
  subtitle: { color: '#a29bfe', fontSize: 15, textAlign: 'center', marginBottom: 4 },
  card: {
    width: '100%',
    backgroundColor: '#1a0f2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d1b4e',
    padding: 16,
    gap: 10,
  },
  lootCard: { borderColor: '#c9a22740' },
  cardTitle: { color: '#c9a227', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: '#6c5a8e', fontSize: 13 },
  statValue: { color: '#e8e0f0', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  itemRow: { gap: 2 },
  itemName: { color: '#f4d03f', fontSize: 13, fontWeight: '700' },
  itemDesc: { color: '#a29bfe', fontSize: 11 },
  primaryButton: {
    width: '100%',
    backgroundColor: '#6c3483',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9b59b6',
    marginTop: 8,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  secondaryButton: { paddingVertical: 12 },
  secondaryButtonText: { color: '#6c5a8e', fontSize: 14 },
});
