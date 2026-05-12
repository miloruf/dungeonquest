import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ClassSelector, { CLASS_HP } from '../components/ClassSelector';
import { useGame } from '../context/gameContext';
import { GameRoom, Player, Skill } from '../types';

const STARTING_SKILLS: Record<Player['class'], Omit<Skill, 'id'>> = {
  warrior: { name: 'Cleave',      description: 'A powerful horizontal slash that hits everything in arc', type: 'combat',   baseRequired: 10, level: 1, useCount: 0 },
  mage:    { name: 'Fireball',    description: 'Hurl a ball of arcane fire that explodes on impact',      type: 'risky',    baseRequired: 11, level: 1, useCount: 0 },
  healer:  { name: 'Holy Light',  description: 'Channel divine energy to heal and blind undead',          type: 'recovery', baseRequired: 7,  level: 1, useCount: 0 },
};

const DIFFICULTIES: { value: GameRoom['difficulty']; label: string; color: string; desc: string }[] = [
  { value: 'easy',   label: 'Easy',   color: '#2ecc71', desc: 'Need 7+  ·  8 turns' },
  { value: 'medium', label: 'Medium', color: '#f39c12', desc: 'Need 10+  ·  12 turns' },
  { value: 'hard',   label: 'Hard',   color: '#e74c3c', desc: 'Need 14+  ·  15 turns  ·  Rare loot' },
];

export default function SoloScreen() {
  const router = useRouter();
  const { setGameState } = useGame();
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<Player['class'] | null>(null);
  const [difficulty, setDifficulty] = useState<GameRoom['difficulty']>('medium');

  const canStart = name.trim().length > 0 && selectedClass !== null;

  const handleStart = () => {
    if (!canStart || !selectedClass) return;
    const maxHp = CLASS_HP[selectedClass];
    const startSkill = STARTING_SKILLS[selectedClass];
    const player: Player = {
      id: 'player-1',
      name: name.trim(),
      class: selectedClass,
      hp: maxHp,
      maxHp,
      inventory: [],
      activeEffects: [],
      skills: [{ ...startSkill, id: 'skill-1' }],
    };
    setGameState({
      room: {
        roomCode: '',
        players: [player],
        status: 'playing',
        currentTurn: player.id,
        difficulty,
      },
      storyHistory: [],
      currentScene: 'dungeon-entrance',
      currentSituation: null,
      lastEvent: null,
      diceResult: null,
    });
    router.push('/game');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>⚔️ Solo Adventure</Text>
          <Text style={styles.subtitle}>Create your hero and enter the dungeon</Text>

          <Text style={styles.sectionLabel}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter hero name..."
            placeholderTextColor="#4a3a6a"
            maxLength={20}
            autoCapitalize="words"
          />

          <Text style={styles.sectionLabel}>Choose Class</Text>
          <ClassSelector selected={selectedClass} onSelect={setSelectedClass} />

          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity
                key={d.value}
                style={[styles.diffButton, difficulty === d.value && { borderColor: d.color, backgroundColor: '#1a0f2e' }]}
                onPress={() => setDifficulty(d.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.diffLabel, difficulty === d.value && { color: d.color }]}>{d.label}</Text>
                <Text style={styles.diffDesc}>{d.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startButton, !canStart && styles.startDisabled]}
            onPress={handleStart}
            disabled={!canStart}
            activeOpacity={0.8}
          >
            <Text style={styles.startText}>Enter the Dungeon</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0a1a' },
  flex: { flex: 1 },
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { color: '#f4d03f', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: '#a29bfe', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  sectionLabel: { color: '#a29bfe', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 },
  input: {
    backgroundColor: '#1e0f3a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3d1f6b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#e8e0f0',
    fontSize: 16,
  },
  diffRow: { flexDirection: 'row', gap: 10 },
  diffButton: {
    flex: 1,
    backgroundColor: '#1e0f3a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3d1f6b',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  diffLabel: { color: '#e8e0f0', fontSize: 14, fontWeight: '700' },
  diffDesc: { color: '#4a3a6a', fontSize: 10 },
  startButton: {
    backgroundColor: '#6c3483',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#9b59b6',
  },
  startDisabled: { opacity: 0.4 },
  startText: { color: '#ffffff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
  backLink: { alignSelf: 'center', marginTop: 8, padding: 8 },
  backLinkText: { color: '#6c5a8e', fontSize: 14 },
});
