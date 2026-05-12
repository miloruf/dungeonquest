import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CONSUMABLE_EFFECTS, EFFECT_ICONS } from '../constants/game';
import { Item } from '../types';

interface Props {
  items: Item[];
  onUse: (item: Item) => void;
}

export default function InventoryPanel({ items, onUse }: Props) {
  if (items.length === 0) {
    return (
      <View style={styles.panel}>
        <Text style={styles.empty}>Keine Items</Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map(item => (
          <View key={item.id} style={styles.chip}>
            <Text style={styles.icon}>{EFFECT_ICONS[item.effect] ?? '✨'}</Text>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc}>{item.description}</Text>
              {CONSUMABLE_EFFECTS.has(item.effect) && (
                <TouchableOpacity style={styles.useBtn} onPress={() => onUse(item)} activeOpacity={0.7}>
                  <Text style={styles.useBtnText}>Verwenden</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel:   { backgroundColor: '#1a0f2e', borderRadius: 10, borderWidth: 1, borderColor: '#2d1b4e', padding: 10 },
  empty:   { color: '#4a3a6a', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  scroll:  { gap: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#3d1f6b', paddingHorizontal: 10, paddingVertical: 7 },
  icon:    { fontSize: 18 },
  name:    { color: '#f4d03f', fontSize: 12, fontWeight: '700' },
  desc:    { color: '#6c5a8e', fontSize: 10 },
  useBtn:  { marginTop: 4, backgroundColor: '#2d1b4e', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  useBtnText: { color: '#c9a227', fontSize: 10, fontWeight: '700' },
});
