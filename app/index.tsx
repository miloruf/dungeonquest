import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { warmUpModel } from '../services/dungeonMaster';

export default function HomeScreen() {
  const router = useRouter();
  useEffect(() => { warmUpModel(); }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DungeonQuest</Text>
        <Text style={styles.subtitle}>Ein KI-Dungeon erwartet dich</Text>
        <TouchableOpacity style={styles.howToBtn} onPress={() => router.push('/onboarding')}>
          <Text style={styles.howToBtnText}>? Wie spielt man</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/room')}
        >
          <Text style={styles.primaryButtonText}>Neues Spiel (Multiplayer)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/solo')}
        >
          <Text style={styles.secondaryButtonText}>Solo-Mode (vs KI)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
    justifyContent: 'space-between',
  },
  header: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#f4d03f',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#a29bfe',
    marginTop: 8,
    textAlign: 'center',
  },
  howToBtn: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#3d1f6b',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  howToBtnText: {
    color: '#6c5a8e',
    fontSize: 13,
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#6c3483',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6c3483',
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#a29bfe',
    fontSize: 18,
    fontWeight: '600',
  },
});
