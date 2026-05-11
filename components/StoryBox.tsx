import { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Message } from '../types';

interface Props {
  messages: Message[];
  isLoading?: boolean;
}

export default function StoryBox({ messages, isLoading = false }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <Text style={styles.empty}>The dungeon awaits your first move...</Text>
        )}
        {messages.map((msg, i) => (
          <View key={i} style={[styles.bubble, msg.role === 'assistant' ? styles.dm : styles.player]}>
            {msg.role === 'assistant' && (
              <Text style={styles.dmLabel}>🎲 Dungeon Master</Text>
            )}
            <Text style={msg.role === 'assistant' ? styles.dmText : styles.playerText}>
              {msg.content}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.bubble}>
            <Text style={styles.loading}>The Dungeon Master ponders...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2d1b4e',
    overflow: 'hidden',
  },
  scroll:   { flex: 1 },
  content:  { padding: 12, gap: 10 },
  empty:    { color: '#4a3a6a', fontStyle: 'italic', textAlign: 'center', marginTop: 16 },
  bubble:   { borderRadius: 10, padding: 12 },
  dm:       { backgroundColor: '#1a0f2e', borderLeftWidth: 3, borderLeftColor: '#c9a227' },
  player:   { backgroundColor: '#0f1a2e', borderLeftWidth: 3, borderLeftColor: '#6c3483', alignSelf: 'flex-end', maxWidth: '85%' },
  dmLabel:  { color: '#c9a227', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  dmText:   { color: '#e8e0f0', fontSize: 14, lineHeight: 21 },
  playerText: { color: '#a29bfe', fontSize: 13 },
  loading:  { color: '#4a3a6a', fontStyle: 'italic' },
});
