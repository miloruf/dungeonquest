import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Player } from '../types';

const CLASSES: { value: Player['class']; label: string; icon: string; desc: string }[] = [
  { value: 'warrior', label: 'Warrior', icon: '⚔️', desc: '120 HP · High armor' },
  { value: 'mage',    label: 'Mage',    icon: '🔮', desc: '80 HP · Strong spells' },
  { value: 'healer',  label: 'Healer',  icon: '✨', desc: '100 HP · Restores allies' },
];

interface Props {
  selected: Player['class'] | null;
  onSelect: (c: Player['class']) => void;
}

export default function ClassSelector({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {CLASSES.map((c) => (
        <TouchableOpacity
          key={c.value}
          style={[styles.card, selected === c.value && styles.cardSelected]}
          onPress={() => onSelect(c.value)}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>{c.icon}</Text>
          <Text style={styles.label}>{c.label}</Text>
          <Text style={styles.desc}>{c.desc}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export const CLASS_HP: Record<Player['class'], number> = {
  warrior: 120,
  mage: 80,
  healer: 100,
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    backgroundColor: '#1e0f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3d1f6b',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  cardSelected: {
    borderColor: '#c9a227',
    backgroundColor: '#2a1550',
    shadowColor: '#c9a227',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  icon:  { fontSize: 28 },
  label: { color: '#f4d03f', fontSize: 14, fontWeight: '700' },
  desc:  { color: '#a29bfe', fontSize: 10, textAlign: 'center' },
});
