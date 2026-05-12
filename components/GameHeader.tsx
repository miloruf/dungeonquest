import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { isAIEnabled } from '../services/dungeonMaster';

interface Props {
  turnCount: number;
  onLeave: () => void;
}

export default function GameHeader({ turnCount, onLeave }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onLeave} activeOpacity={0.7} style={styles.btn}>
        <Text style={styles.title}>⚔️ DungeonQuest</Text>
      </TouchableOpacity>
      <View style={styles.right}>
        {isAIEnabled() && <Text style={styles.aiBadge}>🤖 AI</Text>}
        <Text style={styles.turn}>Turn {turnCount + 1}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn:     { padding: 4 },
  title:   { color: '#c9a227', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  right:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge: { color: '#2ecc71', fontSize: 10, fontWeight: '700', backgroundColor: '#0a2a1a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  turn:    { color: '#4a3a6a', fontSize: 12, fontWeight: '600' },
});
