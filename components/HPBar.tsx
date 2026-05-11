import { StyleSheet, Text, View } from 'react-native';

interface Props {
  current: number;
  max: number;
  showLabel?: boolean;
}

export default function HPBar({ current, max, showLabel = true }: Props) {
  const pct = Math.max(0, Math.min(1, current / max));
  const color = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>{current} / {max} HP</Text>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { color: '#a29bfe', fontSize: 12, fontWeight: '600' },
  track: {
    height: 8,
    backgroundColor: '#2d1b4e',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4a2d7a',
  },
  fill: { height: '100%', borderRadius: 4 },
});
