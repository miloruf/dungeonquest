import { StyleSheet, Text, View } from 'react-native';
import { STATUS_CONFIG } from '../constants/game';
import { ActiveEffect, Situation } from '../types';

const ENV_ICON: Record<string, string> = { burning: '🔥', poison: '☠️', cold: '❄️' };

interface Props {
  activeEffects:     ActiveEffect[];
  environmentalDamage: Situation['environmentalDamage'];
}

export default function EffectsBar({ activeEffects, environmentalDamage }: Props) {
  if (activeEffects.length === 0 && !environmentalDamage) return null;

  return (
    <View style={styles.bar}>
      {activeEffects.map(eff => (
        <View key={eff.id} style={[styles.badge, { borderColor: STATUS_CONFIG[eff.type].color }]}>
          <Text style={styles.text}>{STATUS_CONFIG[eff.type].icon} {eff.duration}</Text>
        </View>
      ))}
      {environmentalDamage && (
        <View style={[styles.badge, { borderColor: '#e67e22' }]}>
          <Text style={styles.text}>{ENV_ICON[environmentalDamage.type]} -{environmentalDamage.magnitude}/turn</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0f2e', borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  text:  { color: '#e8e0f0', fontSize: 11, fontWeight: '700' },
});
