import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EFFECT_ICONS, sellPrice } from '../constants/game';
import { Item, MerchantItem, Player } from '../types';

interface Props {
  inventory:       MerchantItem[];
  playerGold:      number;
  playerInventory: Player['inventory'];
  onBuy:           (mi: MerchantItem) => void;
  onSell:          (item: Item) => void;
  onLeave:         () => void;
}

export default function MerchantPanel({ inventory, playerGold, playerInventory, onBuy, onSell, onLeave }: Props) {
  return (
    <ScrollView style={styles.panel} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>🛒 Händler</Text>
      <Text style={styles.gold}>Dein Gold: 💰 {playerGold}g</Text>

      {inventory.map((mi, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.icon}>{EFFECT_ICONS[mi.item.effect] ?? '✨'}</Text>
          <View style={styles.info}>
            <Text style={styles.itemName}>{mi.item.name}</Text>
            <Text style={styles.itemDesc}>{mi.item.description}</Text>
          </View>
          <TouchableOpacity
            style={[styles.buyBtn, playerGold < mi.price && styles.buyBtnDisabled]}
            onPress={() => onBuy(mi)}
            disabled={playerGold < mi.price}
            activeOpacity={0.8}
          >
            <Text style={styles.buyText}>{mi.price}g</Text>
          </TouchableOpacity>
        </View>
      ))}

      {playerInventory.length > 0 && (
        <>
          <Text style={styles.sellTitle}>Verkaufen</Text>
          {playerInventory.map(item => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.icon}>{EFFECT_ICONS[item.effect] ?? '✨'}</Text>
              <View style={styles.info}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
              </View>
              <TouchableOpacity style={styles.sellBtn} onPress={() => onSell(item)} activeOpacity={0.8}>
                <Text style={styles.sellText}>+{sellPrice(item)}g</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <TouchableOpacity style={styles.leaveBtn} onPress={onLeave} activeOpacity={0.8}>
        <Text style={styles.leaveText}>Weiterziehen →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel:        { backgroundColor: '#1a0f2e', borderRadius: 12, borderWidth: 1, borderColor: '#c9a227' },
  content:      { padding: 14, gap: 10 },
  title:        { color: '#f4d03f', fontSize: 16, fontWeight: '800' },
  gold:         { color: '#a29bfe', fontSize: 12 },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#3d1f6b', paddingHorizontal: 10, paddingVertical: 8 },
  icon:         { fontSize: 18, width: 24, textAlign: 'center' },
  info:         { flex: 1 },
  itemName:     { color: '#e8e0f0', fontSize: 13, fontWeight: '700' },
  itemDesc:     { color: '#6c5a8e', fontSize: 11 },
  buyBtn:       { backgroundColor: '#c9a227', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  buyBtnDisabled:{ backgroundColor: '#3d2e00', opacity: 0.5 },
  buyText:      { color: '#0d0a1a', fontSize: 12, fontWeight: '800' },
  sellTitle:    { color: '#a29bfe', fontSize: 12, fontWeight: '700', marginTop: 4 },
  sellBtn:      { backgroundColor: '#1a2a00', borderRadius: 8, borderWidth: 1, borderColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 6 },
  sellText:     { color: '#2ecc71', fontSize: 12, fontWeight: '800' },
  leaveBtn:     { backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#6c3483', paddingVertical: 10, alignItems: 'center' },
  leaveText:    { color: '#a29bfe', fontSize: 13, fontWeight: '700' },
});
