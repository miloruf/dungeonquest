import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChoiceButtons, { ChoiceDisplay } from '../components/ChoiceButtons';
import DiceRoller from '../components/DiceRoller';
import HPBar from '../components/HPBar';
import StoryBox from '../components/StoryBox';
import { useGame } from '../context/gameContext';
import { getMaxTurns } from '../services/mockDungeonMaster';
import { getDMOpening, getDMOutcome, getDMSituation, isAIEnabled } from '../services/dungeonMaster';
import { subscribeToRoom, updateRoomState } from '../services/roomService';
import { Choice, ChoiceType, DungeonEvent, Message, Player, Situation } from '../types';

type Phase = 'choose' | 'roll' | 'processing';

const CLASS_MODS: Record<Player['class'], Partial<Record<ChoiceType, number>>> = {
  warrior: { combat: -3, risky: -1 },
  mage:    { social: -2, tactical: -1 },
  healer:  { recovery: -3, tactical: -1 },
};

function itemModifier(inventory: Player['inventory'], type: ChoiceType): number {
  let mod = 0;
  for (const item of inventory) {
    if (item.effect === 'attackBoost' && (type === 'combat' || type === 'risky'))  mod -= item.power;
    if (item.effect === 'armorBoost'  && type === 'tactical')                      mod -= item.power;
    if (item.effect === 'healBoost'   && type === 'recovery')                      mod -= item.power;
  }
  return mod;
}

function toDisplayChoice(c: Choice, player: Player): ChoiceDisplay {
  return {
    text: c.text,
    type: c.type,
    requiredRoll: Math.max(1, Math.min(19,
      c.baseRequired
      + (CLASS_MODS[player.class][c.type] ?? 0)
      + itemModifier(player.inventory, c.type)
    )),
  };
}

function recapMessage(player: Player, finalHp: number, event: DungeonEvent): Message {
  const parts: string[] = [`❤️ ${finalHp}/${player.maxHp} HP`];
  if (event.damage)  parts.push(`-${event.damage} dmg`);
  if (event.heal)    parts.push(`+${event.heal} healed`);
  if (event.item)    parts.push(`🎒 ${event.item.name}`);
  return { role: 'system', content: parts.join('  ·  ') };
}

export default function GameScreen() {
  const router = useRouter();
  const { gameState, localPlayerId, addItem, updatePlayerHP, addStoryMessage, setGameState } = useGame();
  const [phase, setPhase]                 = useState<Phase>('choose');
  const [turnCount, setTurnCount]         = useState(0);
  const [pendingChoice, setPendingChoice] = useState<ChoiceDisplay | null>(null);
  const [situation, setSituation]         = useState<Situation | null>(null);
  const [diceKey, setDiceKey]             = useState(0);
  const [showStats, setShowStats]         = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const makeOnChunk = () => {
    let acc = '';
    return (chunk: string) => { acc += chunk; setStreamingText(acc); };
  };

  const isMultiplayer     = gameState.room.roomCode !== '';
  const player            = isMultiplayer
    ? gameState.room.players.find(p => p.id === localPlayerId) ?? gameState.room.players[0]
    : gameState.room.players[0];
  const isMyTurn          = !isMultiplayer || gameState.room.currentTurn === (player?.id ?? '');
  const currentTurnPlayer = gameState.room.players.find(p => p.id === gameState.room.currentTurn);

  const maxTurns  = player ? getMaxTurns(gameState.room.difficulty) : 5;
  const rollBonus = player
    ? player.inventory.filter(i => i.effect === 'rollBonus').reduce((s, i) => s + i.power, 0)
    : 0;

  // Multiplayer: subscribe to Supabase room updates
  useEffect(() => {
    if (!isMultiplayer) return;
    const channel = subscribeToRoom(gameState.room.roomCode, setGameState);
    return () => { channel.unsubscribe(); };
  }, []);

  // Multiplayer: when turn passes to me, load the current situation
  const prevTurnRef = useRef('');
  useEffect(() => {
    if (!isMultiplayer) return;
    const newTurn = gameState.room.currentTurn;
    if (newTurn === prevTurnRef.current) return;
    const wasMyTurn = prevTurnRef.current === (player?.id ?? '');
    prevTurnRef.current = newTurn;
    if (newTurn === (player?.id ?? '') && !wasMyTurn && gameState.currentSituation) {
      setSituation(gameState.currentSituation);
      setPhase('choose');
    }
  }, [gameState.room.currentTurn]);

  // Mount: generate opening story (only if it's my turn or solo)
  useEffect(() => {
    if (!player) {
      const t = setTimeout(() => router.replace('/solo'), 100);
      return () => clearTimeout(t);
    }
    // For multiplayer: only run if no history yet (second player joining skips this)
    // For solo: always run and clear any stale history from a previous game
    const shouldStart = isMultiplayer ? gameState.storyHistory.length === 0 : true;
    if (shouldStart && isMyTurn) {
      setGameState(prev => ({ ...prev, storyHistory: [], currentSituation: null }));
      (async () => {
        const openingContent = await getDMOpening(player, gameState.room.difficulty, makeOnChunk());
        const openingMsg: Message = { role: 'assistant', content: openingContent };
        addStoryMessage(openingMsg);
        setStreamingText('');
        if (isMultiplayer) {
          const turnMsg: Message = { role: 'system', content: `⚔️ ${player.name}'s turn` };
          addStoryMessage(turnMsg);
        }
        const first = await getDMSituation(gameState.room.difficulty, null, [openingMsg], makeOnChunk());
        const firstMsg: Message = { role: 'assistant', content: first.description };
        addStoryMessage(firstMsg);
        setStreamingText('');
        setSituation(first);
        if (isMultiplayer) {
          const history = [openingMsg, { role: 'system' as const, content: `⚔️ ${player.name}'s turn` }, firstMsg];
          updateRoomState(gameState.room.roomCode, {
            storyHistory: history,
            currentSituation: first,
          }).catch(console.error);
        }
      })();
    }
  }, []);

  function handleLeave() {
    if (isMultiplayer && player) {
      const leaveMsg: Message = { role: 'system', content: `${player.name} has left the game.` };
      updateRoomState(gameState.room.roomCode, {
        storyHistory: [...gameState.storyHistory, leaveMsg],
      }).catch(console.error);
    }
    router.replace('/');
  }

  const handleChoice = (choice: ChoiceDisplay) => {
    setPendingChoice(choice);
    setDiceKey(k => k + 1);
    setPhase('roll');
  };

  const handleRoll = async (rawRoll: number) => {
    if (!player || !pendingChoice || !situation) return;
    setPhase('processing');

    const effectiveRoll = Math.min(20, rawRoll + rollBonus);
    addStoryMessage({ role: 'user', content: pendingChoice.text });

    const event = await getDMOutcome(
      pendingChoice.type,
      pendingChoice.text,
      situation.event,
      effectiveRoll,
      pendingChoice.requiredRoll,
      gameState.room.difficulty,
      makeOnChunk(),
    );
    addStoryMessage({ role: 'assistant', content: event.story });
    setStreamingText('');

    const newHp    = event.damage != null ? Math.max(0, player.hp - event.damage) : player.hp;
    if (event.damage != null) updatePlayerHP(player.id, newHp);
    const healedHp = event.heal != null ? Math.min(player.maxHp, newHp + event.heal) : newHp;
    if (event.heal != null) updatePlayerHP(player.id, healedHp);
    if (event.item) addItem(player.id, event.item);
    setGameState(prev => ({ ...prev, lastEvent: event }));

    const newTurn = turnCount + 1;
    setTurnCount(newTurn);
    const finalHp = event.heal != null ? healedHp : newHp;

    // Recap message
    const recap = recapMessage(player, finalHp, event);
    addStoryMessage(recap);

    // Pre-compute snapshot for setTimeout (avoids stale closure)
    const snap = {
      player,
      event,
      pendingChoice,
      storyHistory:  gameState.storyHistory,
      players:       gameState.room.players,
      currentTurn:   gameState.room.currentTurn,
      roomCode:      gameState.room.roomCode,
      difficulty:    gameState.room.difficulty,
      isMultiplayer: gameState.room.roomCode !== '',
    };
    const updatedPlayer: Player = {
      ...snap.player,
      hp: finalHp,
      inventory: snap.event.item
        ? [...snap.player.inventory, snap.event.item]
        : snap.player.inventory,
    };
    const updatedPlayers = snap.players.map(p => p.id === snap.player.id ? updatedPlayer : p);
    const prevMessages: Message[] = [
      ...snap.storyHistory,
      { role: 'user',      content: snap.pendingChoice.text },
      { role: 'assistant', content: snap.event.story        },
      recap,
    ];
    const currentIdx = snap.players.findIndex(p => p.id === snap.currentTurn);
    const nextIdx    = (currentIdx + 1) % snap.players.length;
    const nextTurnId = snap.players[nextIdx].id;
    const nextPlayerName = snap.players[nextIdx].name;

    await new Promise(r => setTimeout(r, 1200));

    if (finalHp <= 0) {
      router.push(`/result?won=false&turns=${newTurn}`);
      return;
    }
    if (newTurn >= maxTurns) {
      router.push(`/result?won=true&turns=${newTurn}`);
      return;
    }

    const next = await getDMSituation(snap.difficulty, snap.pendingChoice.type, snap.storyHistory, makeOnChunk());

    const turnDivider: Message | null = snap.isMultiplayer
      ? { role: 'system', content: `⚔️ ${nextPlayerName}'s turn` }
      : null;
    if (turnDivider) addStoryMessage(turnDivider);
    addStoryMessage({ role: 'assistant', content: next.description });
    setStreamingText('');
    setSituation(next);
    setPendingChoice(null);
    setPhase('choose');

    if (snap.isMultiplayer) {
      const nextHistory: Message[] = [
        ...prevMessages,
        ...(turnDivider ? [turnDivider] : []),
        { role: 'assistant', content: next.description },
      ];
      updateRoomState(snap.roomCode, {
        players:          updatedPlayers,
        storyHistory:     nextHistory,
        currentTurn:      nextTurnId,
        lastEvent:        snap.event,
        currentSituation: next,
      }).catch(console.error);
    }
  };

  if (!player) return null;

  const displayChoices: ChoiceDisplay[] = isMyTurn
    ? (situation?.choices ?? []).map(c => toDisplayChoice(c, player))
    : [];

  const EFFECT_ICONS: Record<string, string> = {
    rollBonus: '🎲', attackBoost: '⚔️', armorBoost: '🛡️',
    healBoost: '💚', fireResistance: '🔥', poisonResistance: '☠️',
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} activeOpacity={0.7} style={styles.homeBtn}>
          <Text style={styles.homeTitle}>⚔️ DungeonQuest</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {isAIEnabled() && <Text style={styles.aiBadge}>🤖 AI</Text>}
          <Text style={styles.turnBadge}>Turn {turnCount + 1}/{maxTurns}</Text>
        </View>
      </View>

      <View style={styles.topBar}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <Text style={styles.playerClass}>
            {player.class} · {gameState.room.difficulty}
            {rollBonus > 0 ? `  ·  +${rollBonus} roll` : ''}
          </Text>
        </View>
        <View style={styles.hpSection}>
          <HPBar current={player.hp} max={player.maxHp} />
        </View>
        <TouchableOpacity
          style={styles.statsBtn}
          onPress={() => setShowStats(s => !s)}
          activeOpacity={0.7}
        >
          <Text style={styles.statsBtnText}>
            🎒 {player.inventory.length}
          </Text>
        </TouchableOpacity>
      </View>

      {showStats && (
        <View style={styles.statsPanel}>
          {player.inventory.length === 0
            ? <Text style={styles.statsEmpty}>Keine Items</Text>
            : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
                {player.inventory.map(item => (
                  <View key={item.id} style={styles.itemChip}>
                    <Text style={styles.itemIcon}>{EFFECT_ICONS[item.effect] ?? '✨'}</Text>
                    <View>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )
          }
        </View>
      )}

      {isMultiplayer && (
        <View style={styles.turnBar}>
          {isMyTurn
            ? <Text style={styles.turnBarYou}>Dein Zug</Text>
            : <Text style={styles.turnBarOther}>{currentTurnPlayer?.name ?? '?'} ist am Zug...</Text>
          }
          {gameState.room.players.length > 1 && (
            <View style={styles.playerPips}>
              {gameState.room.players.map(p => (
                <View key={p.id} style={[styles.pip, p.id === gameState.room.currentTurn && styles.pipActive]} />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.storySection}>
        <StoryBox messages={gameState.storyHistory} isLoading={phase === 'processing'} streamingMessage={streamingText} />
      </View>

      <View style={styles.controls}>
        {phase === 'choose' && isMyTurn && (
          <ChoiceButtons choices={displayChoices} onChoice={handleChoice} />
        )}

        {phase === 'choose' && !isMyTurn && (
          <View style={styles.waitingBox}>
            <ActivityIndicator color="#6c3483" size="small" />
            <Text style={styles.waitingText}>
              Warte auf {currentTurnPlayer?.name ?? 'anderen Spieler'}...
            </Text>
          </View>
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
  container:      { flex: 1, backgroundColor: '#0d0a1a', padding: 12, gap: 8 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeBtn:        { padding: 4 },
  homeTitle:      { color: '#c9a227', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBadge:        { color: '#2ecc71', fontSize: 10, fontWeight: '700', backgroundColor: '#0a2a1a', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  turnBadge:      { color: '#4a3a6a', fontSize: 12, fontWeight: '600' },
  topBar:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerInfo:     { flex: 1 },
  playerName:     { color: '#f4d03f', fontSize: 16, fontWeight: '800' },
  playerClass:    { color: '#a29bfe', fontSize: 11, marginTop: 2 },
  hpSection:      { flex: 1 },
  statsBtn:       { backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#3d1f6b', paddingHorizontal: 10, paddingVertical: 6 },
  statsBtnText:   { color: '#a29bfe', fontSize: 12, fontWeight: '700' },
  statsPanel:     { backgroundColor: '#1a0f2e', borderRadius: 10, borderWidth: 1, borderColor: '#2d1b4e', padding: 10 },
  statsEmpty:     { color: '#4a3a6a', fontSize: 12, fontStyle: 'italic', textAlign: 'center' },
  statsScroll:    { gap: 8 },
  itemChip:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e0f3a', borderRadius: 8, borderWidth: 1, borderColor: '#3d1f6b', paddingHorizontal: 10, paddingVertical: 7 },
  itemIcon:       { fontSize: 18 },
  itemName:       { color: '#f4d03f', fontSize: 12, fontWeight: '700' },
  itemDesc:       { color: '#6c5a8e', fontSize: 10 },
  turnBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a0f2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  turnBarYou:     { color: '#c9a227', fontSize: 12, fontWeight: '700' },
  turnBarOther:   { color: '#6c5a8e', fontSize: 12, fontStyle: 'italic' },
  playerPips:     { flexDirection: 'row', gap: 6 },
  pip:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3d1f6b' },
  pipActive:      { backgroundColor: '#c9a227' },
  storySection:   { flex: 1 },
  controls:       { gap: 10, paddingTop: 4 },
  waitingBox:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  waitingText:    { color: '#4a3a6a', fontSize: 14, fontStyle: 'italic' },
  pendingBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e0f3a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3d1f6b' },
  pendingLabel:   { color: '#6c5a8e', fontSize: 12 },
  pendingText:    { color: '#e8e0f0', fontSize: 12, fontWeight: '700', flex: 1 },
  processingRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  processingText: { color: '#4a3a6a', fontSize: 14, fontStyle: 'italic' },
});
