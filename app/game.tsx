import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChoiceButtons, { ChoiceDisplay } from '../components/ChoiceButtons';
import DiceRoller from '../components/DiceRoller';
import HPBar from '../components/HPBar';
import StoryBox from '../components/StoryBox';
import { useGame } from '../context/gameContext';
import { getMockDungeonMasterResponse, getMaxTurns, getOpeningStory } from '../services/mockDungeonMaster';
import { Choice, ChoiceType, Player } from '../types';

type Phase = 'choose' | 'roll' | 'processing';

// How each item effect modifies the required roll for a choice type
function itemModifier(inventory: Player['inventory'], type: ChoiceType): number {
  let mod = 0;
  for (const item of inventory) {
    if (item.effect === 'attackBoost' && (type === 'combat' || type === 'risky'))  mod -= item.power;
    if (item.effect === 'armorBoost'  && type === 'tactical')                      mod -= item.power;
    if (item.effect === 'healBoost'   && type === 'recovery')                      mod -= item.power;
  }
  return mod;
}

// Class gives a natural advantage on certain choice types
const CLASS_MODS: Record<Player['class'], Partial<Record<ChoiceType, number>>> = {
  warrior: { combat: -3, risky: -1 },
  mage:    { social: -2, tactical: -1 },
  healer:  { recovery: -3, tactical: -1 },
};

const DEFAULT_CHOICES: Choice[] = [
  { text: 'Proceed cautiously',          type: 'tactical', baseRequired: 8  },
  { text: 'Explore the area thoroughly', type: 'risky',    baseRequired: 11 },
  { text: 'Rest and recover',            type: 'recovery', baseRequired: 5  },
];

export default function GameScreen() {
  const router = useRouter();
  const { gameState, addItem, updatePlayerHP, addStoryMessage, setGameState } = useGame();
  const [phase, setPhase] = useState<Phase>('choose');
  const [turnCount, setTurnCount] = useState(0);
  const [pendingChoice, setPendingChoice] = useState<ChoiceDisplay | null>(null);
  const [diceKey, setDiceKey] = useState(0);

  const player   = gameState.room.players[0];
  const maxTurns = player ? getMaxTurns(gameState.room.difficulty) : 5;

  // Roll bonus from inventory
  const rollBonus = player
    ? player.inventory.filter(i => i.effect === 'rollBonus').reduce((s, i) => s + i.power, 0)
    : 0;

  // Compute display choices — apply class + item modifiers to baseRequired
  const rawChoices: Choice[] = gameState.lastEvent?.choices ?? DEFAULT_CHOICES;
  const displayChoices: ChoiceDisplay[] = player
    ? rawChoices.map(c => ({
        text: c.text,
        requiredRoll: Math.max(1, Math.min(19,
          c.baseRequired
          + (CLASS_MODS[player.class][c.type] ?? 0)
          + itemModifier(player.inventory, c.type)
        )),
      }))
    : rawChoices.map(c => ({ text: c.text, requiredRoll: c.baseRequired }));

  useEffect(() => {
    if (!player) {
      const t = setTimeout(() => router.replace('/solo'), 100);
      return () => clearTimeout(t);
    }
    if (gameState.storyHistory.length === 0) {
      addStoryMessage({
        role: 'assistant',
        content: getOpeningStory(player, gameState.room.difficulty),
      });
    }
  }, []);

  const handleChoice = (choice: ChoiceDisplay) => {
    setPendingChoice(choice);
    setDiceKey(k => k + 1);
    setPhase('roll');
  };

  const handleRoll = (rawRoll: number) => {
    if (!player || !pendingChoice) return;
    setPhase('processing');

    const effectiveRoll = Math.min(20, rawRoll + rollBonus);
    addStoryMessage({ role: 'user', content: pendingChoice.text });

    const event = getMockDungeonMasterResponse(
      pendingChoice.text,
      effectiveRoll,
      pendingChoice.requiredRoll,
      gameState,
    );
    addStoryMessage({ role: 'assistant', content: event.story });

    const newHp = event.damage != null ? Math.max(0, player.hp - event.damage) : player.hp;
    if (event.damage != null) updatePlayerHP(player.id, newHp);
    if (event.item) addItem(player.id, event.item);
    setGameState(prev => ({ ...prev, lastEvent: event }));

    const newTurn = turnCount + 1;
    setTurnCount(newTurn);

    setTimeout(() => {
      if (newHp <= 0) {
        router.push(`/result?won=false&turns=${newTurn}`);
        return;
      }
      if (newTurn >= maxTurns) {
        router.push(`/result?won=true&turns=${newTurn}`);
        return;
      }
      setPendingChoice(null);
      setPhase('choose');
    }, 1200);
  };

  if (!player) return null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.7} style={styles.homeBtn}>
          <Text style={styles.homeTitle}>⚔️ DungeonQuest</Text>
        </TouchableOpacity>
        <Text style={styles.turnBadge}>Turn {turnCount + 1}/{maxTurns}</Text>
      </View>

      {/* Player bar */}
      <View style={styles.topBar}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerClass}>
            {player.class} · {gameState.room.difficulty}
            {rollBonus > 0 ? `  ·  +${rollBonus} roll bonus` : ''}
          </Text>
        </View>
        <View style={styles.hpSection}>
          <HPBar current={player.hp} max={player.maxHp} />
        </View>
      </View>

      {/* Story */}
      <View style={styles.storySection}>
        <StoryBox messages={gameState.storyHistory} isLoading={phase === 'processing'} />
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {phase === 'choose' && (
          <ChoiceButtons choices={displayChoices} onChoice={handleChoice} />
        )}

        {(phase === 'roll' || phase === 'processing') && (
          <>
            {pendingChoice && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingLabel}>Action: </Text>
                <Text style={styles.pendingText}>{pendingChoice.text}</Text>
              </View>
            )}
            <DiceRoller
              key={diceKey}
              onRoll={handleRoll}
              disabled={phase !== 'roll'}
              requiredRoll={pendingChoice?.requiredRoll}
              bonus={rollBonus}
            />
            {phase === 'processing' && (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#c9a227" size="small" />
                <Text style={styles.processingText}>The dungeon shifts...</Text>
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0d0a1a', padding: 12, gap: 10 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeBtn:        { padding: 4 },
  homeTitle:      { color: '#c9a227', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  turnBadge:      { color: '#4a3a6a', fontSize: 12, fontWeight: '600' },
  topBar:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  playerInfo:     { flex: 1 },
  playerName:     { color: '#f4d03f', fontSize: 16, fontWeight: '800' },
  playerClass:    { color: '#a29bfe', fontSize: 11, marginTop: 2 },
  hpSection:      { flex: 1 },
  storySection:   { flex: 1 },
  controls:       { gap: 10, paddingTop: 4 },
  pendingBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e0f3a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3d1f6b' },
  pendingLabel:   { color: '#6c5a8e', fontSize: 12 },
  pendingText:    { color: '#e8e0f0', fontSize: 12, fontWeight: '700', flex: 1 },
  processingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  processingText: { color: '#4a3a6a', fontSize: 14, fontStyle: 'italic' },
});
