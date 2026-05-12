import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GameRoom, Player } from '../types';
import HPBar from './HPBar';
import ManaBar from './ManaBar';

interface Props {
  player:            Player;
  difficulty:        GameRoom['difficulty'];
  rollBonus:         number;
  onToggleInventory: () => void;
}

export default function PlayerStatusBar({ player, difficulty, rollBonus, onToggleInventory }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{player.name}</Text>
        <Text style={styles.sub}>
          {player.class} · {difficulty}
          {rollBonus > 0 ? `  ·  +${rollBonus} roll` : ''}
        </Text>
      </View>
      <View style={styles.bars}>
        <HPBar current={player.hp} max={player.maxHp} />
        <ManaBar current={player.mana} max={player.maxMana} />
      </View>
      {player.gold > 0 && (
        <View style={styles.gold}>
          <Text style={styles.goldText}>💰 {player.gold}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.bag} onPress={onToggleInventory} activeOpacity={0.7}>
        <Text style={styles.bagText}>🎒 {player.inventory.length}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info:     { flex: 1 },
  name:     { color: '#f4d03f', fontSize: 16, fontWeight: '800' },
  sub:      { color: '#a29bfe', fontSize: 11, marginTop: 2 },
  bars:     { flex: 1, gap: 4 },
  gold:     { backgroundColor: '#2a1a00', borderRadius: 8, borderWidth: 1, borderColor: '#c9a227', paddingHorizontal: 10, paddingVertical: 6 },
  goldText: { color: '#f4d03f', fontSize: 12, fontWeight: '800' },
  bag:      { backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#3d1f6b', paddingHorizontal: 10, paddingVertical: 6 },
  bagText:  { color: '#a29bfe', fontSize: 12, fontWeight: '700' },
});
