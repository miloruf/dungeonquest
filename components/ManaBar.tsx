import { StyleSheet, Text, View } from 'react-native';

interface Props {
  current: number;
  max: number;
  showLabel?: boolean;
}

export default function ManaBar({ current, max, showLabel = true }: Props) {
  const pct = Math.max(0, Math.min(1, current / max));

  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>{current} / {max} MP</Text>
      )}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` as any }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label:     { color: '#a29bfe', fontSize: 12, fontWeight: '600' },
  track:     { height: 8, backgroundColor: '#1a0a2e', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#3d1f6b' },
  fill:      { height: '100%', borderRadius: 4, backgroundColor: '#6c3483' },
});
