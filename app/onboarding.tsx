import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  {
    icon: '⚔️',
    title: 'Willkommen bei DungeonQuest',
    body: 'Du erkundest einen Dungeon, kämpfst gegen Monster, findest Schätze und überlebst so lange wie möglich.\n\nDer Dungeon Master erzählt die Geschichte — deine Entscheidungen und Würfelglück bestimmen den Ausgang.',
  },
  {
    icon: '🎲',
    title: 'Der Spielablauf',
    body: '1. Du siehst eine Situation (Kampf, Schatz, Falle...)\n2. Wähle eine Aktion aus\n3. Würfle den d20\n4. Das Ergebnis bestimmt, was passiert\n\nJede Aktion hat einen Mindestwurf — je schwieriger die Aktion, desto höher die Anforderung.',
  },
  {
    icon: '🧙',
    title: 'Klassen',
    body: '⚔️  Warrior — 120 HP\nVorteile bei Kampf (-3) und riskanten Aktionen (-1)\n\n🔮  Mage — 80 HP\nVorteile bei sozialen (-2) und taktischen (-1) Aktionen\n\n✨  Healer — 100 HP\nVorteile bei Erholung (-3) und taktischen (-1) Aktionen\n\nDie Klasse reduziert den benötigten Würfelwurf für passende Aktionen.',
  },
  {
    icon: '🎒',
    title: 'Items & Boni',
    body: 'Items findest du in Schatzkammern. Sie verbessern deine Würfe dauerhaft:\n\n🎲  Roll Bonus — direkt auf jeden Würfelwurf addiert\n⚔️  Attack Boost — erleichtert Kampfaktionen\n🛡️  Armor Boost — erleichtert defensive Aktionen\n💚  Heal Boost — erleichtert Erholungsaktionen\n\nItems stapeln sich — sammle so viele wie möglich!',
  },
  {
    icon: '💀',
    title: 'Schwierigkeit & Ziel',
    body: '🟢  Leicht — 8 Turns, Need 7+, wenig Schaden\n🟡  Mittel — 12 Turns, Need 10+, moderater Schaden\n🔴  Schwer — 15 Turns, Need 14+, viel Schaden, aber seltene Items\n\nÜberlebe alle Turns mit mehr als 0 HP — dann gewinnst du.\nFällst du auf 0 HP — Game Over.\n\nViel Erfolg, Held.',
  },
];

export default function OnboardingScreen() {
  const router   = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [current, setCurrent] = useState(0);

  function goTo(index: number) {
    scrollRef.current?.scrollTo({ x: index * SCREEN_W, animated: true });
    setCurrent(index);
  }

  function handleScroll(e: { nativeEvent: { contentOffset: { x: number } } }) {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setCurrent(index);
  }

  const isLast = current === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Skip button */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Überspringen</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slider}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            <Text style={styles.slideIcon}>{slide.icon}</Text>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideBody}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === current && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {current > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => goTo(current - 1)}>
            <Text style={styles.backBtnText}>← Zurück</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        {isLast ? (
          <TouchableOpacity style={styles.startBtn} onPress={() => router.replace('/')}>
            <Text style={styles.startBtnText}>Los geht's! ⚔️</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={() => goTo(current + 1)}>
            <Text style={styles.nextBtnText}>Weiter →</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#0d0a1a' },
  topRow:        { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  skipBtn:       { padding: 8 },
  skipText:      { color: '#4a3a6a', fontSize: 13 },
  slider:        { flex: 1 },
  slide:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  slideIcon:     { fontSize: 64 },
  slideTitle:    { color: '#f4d03f', fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  slideBody:     { color: '#c8bfe0', fontSize: 15, lineHeight: 24, textAlign: 'left', alignSelf: 'stretch' },
  dots:          { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  dot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3d1f6b' },
  dotActive:     { backgroundColor: '#c9a227', width: 20 },
  navRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  backBtn:       { padding: 12 },
  backBtnText:   { color: '#a29bfe', fontSize: 15, fontWeight: '600' },
  nextBtn:       { backgroundColor: '#6c3483', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnText:   { color: '#fff', fontSize: 15, fontWeight: '700' },
  startBtn:      { backgroundColor: '#c9a227', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  startBtnText:  { color: '#0d0a1a', fontSize: 15, fontWeight: '800' },
});
