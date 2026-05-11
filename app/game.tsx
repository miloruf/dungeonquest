import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GameScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Spiel läuft</Text>
      <Text style={styles.placeholder}>Coming in Block 7</Text>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Zurück</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0a2e', alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 24, color: '#f4d03f', fontWeight: 'bold' },
  placeholder: { fontSize: 14, color: '#a29bfe' },
  backButton: { marginTop: 16, padding: 12 },
  backText: { color: '#ffffff', fontSize: 16 },
});
