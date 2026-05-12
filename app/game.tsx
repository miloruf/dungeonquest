import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChoiceDisplay } from '../components/ChoiceButtons';
import EffectsBar from '../components/EffectsBar';
import GameHeader from '../components/GameHeader';
import InventoryPanel from '../components/InventoryPanel';
import PhaseControls from '../components/PhaseControls';
import PlayerStatusBar from '../components/PlayerStatusBar';
import StoryBox from '../components/StoryBox';
import { STATUS_CONFIG, sellPrice } from '../constants/game';
import { useGame } from '../context/gameContext';
import { getDMOutcome, getDMSituation } from '../services/dungeonMaster';
import { subscribeToRoom, updateRoomState } from '../services/roomService';
import { ActiveEffect, Choice, ChoiceType, DungeonEvent, Item, MerchantItem, Message, Player, Situation, Skill } from '../types';

type Phase = 'choose' | 'roll' | 'processing' | 'merchant';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const CLASS_MODS: Record<Player['class'], Partial<Record<ChoiceType, number>>> = {
  warrior: { combat: -3, risky: -1 },
  mage:    { social: -2, tactical: -1 },
  healer:  { recovery: -3, tactical: -1 },
};

function itemModifier(inventory: Player['inventory'], type: ChoiceType): number {
  let mod = 0;
  for (const item of inventory) {
    if (item.effect === 'attackBoost' && (type === 'combat' || type === 'risky')) mod -= item.power;
    if (item.effect === 'armorBoost'  && type === 'tactical')                     mod -= item.power;
    if (item.effect === 'healBoost'   && type === 'recovery')                     mod -= item.power;
  }
  return mod;
}

function effectModifier(activeEffects: ActiveEffect[], type: ChoiceType): number {
  return activeEffects.reduce((mod, eff) => {
    if (eff.type === 'paralysis')                                        return mod + eff.magnitude;
    if (eff.type === 'blessed')                                          return mod - eff.magnitude;
    if (eff.type === 'strengthened' && (type === 'combat' || type === 'risky')) return mod - eff.magnitude;
    return mod;
  }, 0);
}

function toDisplayChoice(c: Choice, player: Player): ChoiceDisplay {
  return {
    text: c.text,
    type: c.type,
    requiredRoll: Math.max(1, Math.min(19,
      c.baseRequired
      + (CLASS_MODS[player.class][c.type] ?? 0)
      + itemModifier(player.inventory, c.type)
      + effectModifier(player.activeEffects, c.type)
    )),
  };
}

function recapMessage(player: Player, finalHp: number, event: DungeonEvent, effectDmg = 0, envDmg = 0): Message {
  const parts = [`❤️ ${finalHp}/${player.maxHp} HP`];
  if (event.damage)  parts.push(`-${event.damage} dmg`);
  if (event.heal)    parts.push(`+${event.heal} healed`);
  if (effectDmg > 0) parts.push(`💀 -${effectDmg} effect`);
  if (envDmg > 0)    parts.push(`🌡️ -${envDmg} env`);
  if (event.item)    parts.push(`🎒 ${event.item.name}`);
  return { role: 'system', content: parts.join('  ·  ') };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const router = useRouter();
  const { gameState, localPlayerId, addItem, removeItem, updatePlayerHP, addStoryMessage, setGameState } = useGame();

  const [phase, setPhase]                 = useState<Phase>('choose');
  const [turnCount, setTurnCount]         = useState(0);
  const [pendingChoice, setPendingChoice] = useState<ChoiceDisplay | null>(null);
  const [situation, setSituation]         = useState<Situation | null>(null);
  const [diceKey, setDiceKey]             = useState(0);
  const [showInventory, setShowInventory] = useState(false);
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
  const rollBonus         = player?.inventory.filter(i => i.effect === 'rollBonus').reduce((s, i) => s + i.power, 0) ?? 0;

  // Multiplayer: subscribe to Supabase room updates
  useEffect(() => {
    if (!isMultiplayer) return;
    const channel = subscribeToRoom(gameState.room.roomCode, setGameState);
    return () => { channel.unsubscribe(); };
  }, []);

  // Multiplayer: load current situation when turn passes to me
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

  // Mount: generate opening scene
  useEffect(() => {
    if (!player) {
      const t = setTimeout(() => router.replace('/solo'), 100);
      return () => clearTimeout(t);
    }
    const shouldStart = isMultiplayer ? gameState.storyHistory.length === 0 : true;
    if (!shouldStart || !isMyTurn) return;

    setGameState(prev => ({ ...prev, storyHistory: [], currentSituation: null }));
    (async () => {
      const first = await getDMSituation(
        gameState.room.difficulty, null, [], player.class, makeOnChunk(), player,
      );
      const openingMsg: Message = { role: 'assistant', content: first.description };
      addStoryMessage(openingMsg);
      setStreamingText('');
      setSituation(first);
      if (first.event === 'merchant' && first.merchantInventory?.length) setPhase('merchant');

      if (isMultiplayer) {
        const turnMsg: Message = { role: 'system', content: `⚔️ ${player.name}'s turn` };
        addStoryMessage(turnMsg);
        updateRoomState(gameState.room.roomCode, {
          storyHistory: [openingMsg, turnMsg],
          currentSituation: first,
        }).catch(console.error);
      }
    })();
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleLeave() {
    if (isMultiplayer && player) {
      updateRoomState(gameState.room.roomCode, {
        storyHistory: [...gameState.storyHistory, { role: 'system', content: `${player.name} has left the game.` }],
      }).catch(console.error);
    }
    router.replace('/');
  }

  function handleUseItem(item: Item) {
    if (!player) return;
    let msg = '';
    if (item.effect === 'healBoost') {
      const amt = Math.min(player.maxHp - player.hp, item.power * 10);
      updatePlayerHP(player.id, player.hp + amt);
      msg = `${player.name} trinkt ${item.name} und erholt ${amt} HP.`;
    } else if (item.effect === 'poisonResistance') {
      const amt = Math.min(player.maxHp - player.hp, 5);
      if (amt > 0) updatePlayerHP(player.id, player.hp + amt);
      msg = `${player.name} verwendet ${item.name}. Das Gift wird neutralisiert.`;
    } else if (item.effect === 'fireResistance') {
      msg = `${player.name} aktiviert ${item.name}. Feuerschutz ist jetzt aktiv.`;
    } else if (item.effect === 'manaRestore') {
      const amt = Math.min(player.maxMana - player.mana, item.power * 15);
      setGameState(prev => ({ ...prev, room: { ...prev.room, players: prev.room.players.map(p =>
        p.id === player.id ? { ...p, mana: Math.min(p.maxMana, p.mana + amt) } : p
      )}}));
      msg = `💧 ${player.name} trinkt ${item.name} und erholt ${amt} Mana.`;
    } else if (item.effect === 'learnSkill' && item.skillData) {
      const newSkill: Skill = {
        id: `skill-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: item.skillData.name, description: item.skillData.description,
        type: item.skillData.type, baseRequired: item.skillData.baseRequired,
        manaCost: item.skillData.baseRequired * 2, level: 1, useCount: 0,
      };
      setGameState(prev => ({ ...prev, room: { ...prev.room, players: prev.room.players.map(p =>
        p.id === player.id ? { ...p, skills: [...p.skills, newSkill] } : p
      )}}));
      msg = `📜 ${player.name} liest ${item.name} und erlernt ${item.skillData.name}!`;
    }
    removeItem(player.id, item.id);
    if (msg) addStoryMessage({ role: 'system', content: msg });
  }

  function handleSellItem(item: Item) {
    if (!player) return;
    const price = sellPrice(item);
    setGameState(prev => ({ ...prev, room: { ...prev.room, players: prev.room.players.map(p =>
      p.id === player.id ? { ...p, gold: p.gold + price, inventory: p.inventory.filter(i => i.id !== item.id) } : p
    )}}));
    addStoryMessage({ role: 'system', content: `💰 Verkauft: ${item.name} (+${price}g)` });
  }

  function handleBuyItem(mi: MerchantItem) {
    if (!player || player.gold < mi.price) return;
    setGameState(prev => ({ ...prev, room: { ...prev.room, players: prev.room.players.map(p =>
      p.id === player.id ? { ...p, gold: p.gold - mi.price, inventory: [...p.inventory, mi.item] } : p
    )}}));
    addStoryMessage({ role: 'system', content: `🛒 Gekauft: ${mi.item.name} (−${mi.price}g)` });
  }

  async function handleLeaveMerchant() {
    if (!player) return;
    setPhase('processing');
    addStoryMessage({ role: 'system', content: '🚶 Du verlässt den Händler.' });
    setTurnCount(t => t + 1);
    const next = await getDMSituation(gameState.room.difficulty, 'social', gameState.storyHistory, player.class, makeOnChunk());
    addStoryMessage({ role: 'assistant', content: next.description });
    setStreamingText('');
    setSituation(next);
    setPhase(next.event === 'merchant' && next.merchantInventory?.length ? 'merchant' : 'choose');
  }

  function handleChoice(choice: ChoiceDisplay) {
    setPendingChoice(choice);
    setDiceKey(k => k + 1);
    setPhase('roll');
  }

  async function handleRoll(rawRoll: number) {
    if (!player || !pendingChoice || !situation) return;
    setPhase('processing');

    const effectiveRoll = Math.min(20, rawRoll + rollBonus);
    const isChaos       = rawRoll === 1 ? Math.random() < 0.5 : Math.random() < 0.08;
    addStoryMessage({ role: 'user', content: pendingChoice.text });

    const usedSkill = pendingChoice.isClassSkill
      ? player.skills.find(s => s.name === pendingChoice.text) ?? null
      : null;

    const event = await getDMOutcome(
      pendingChoice.type, pendingChoice.text, situation.event,
      effectiveRoll, pendingChoice.requiredRoll,
      gameState.room.difficulty, isChaos, player.inventory,
      usedSkill ? { name: usedSkill.name, level: usedSkill.level, description: usedSkill.description } : null,
      situation.description, makeOnChunk(),
    );
    addStoryMessage({ role: 'assistant', content: event.story });
    setStreamingText('');
    if (event.chaosStory) addStoryMessage({ role: 'chaos', content: event.chaosStory });

    // Accumulate all HP changes
    let hp = player.hp;
    if (event.damage != null) hp = Math.max(0, hp - event.damage);
    if (event.heal   != null) hp = Math.min(player.maxHp, hp + event.heal);

    // Apply new effect
    const withNewEffect: ActiveEffect[] = event.applyEffect
      ? [...player.activeEffects, event.applyEffect]
      : [...player.activeEffects];
    if (event.applyEffect) {
      addStoryMessage({ role: 'system', content: STATUS_CONFIG[event.applyEffect.type].apply });
    }

    // Tick effects
    let effectDmg = 0;
    const survivors: ActiveEffect[] = [];
    for (const eff of withNewEffect) {
      if (eff.type === 'poison' || eff.type === 'burning') {
        const resisted = player.inventory.some(i =>
          (eff.type === 'poison'  && i.effect === 'poisonResistance') ||
          (eff.type === 'burning' && i.effect === 'fireResistance')
        );
        if (!resisted) effectDmg += eff.magnitude;
      }
      const remaining = eff.duration - 1;
      if (remaining > 0) survivors.push({ ...eff, duration: remaining });
      else addStoryMessage({ role: 'system', content: STATUS_CONFIG[eff.type].expire });
    }
    if (effectDmg > 0) {
      hp = Math.max(0, hp - effectDmg);
      addStoryMessage({ role: 'system', content: `💀 Status effects: -${effectDmg} HP` });
    }

    // Environmental damage
    let envDmg = 0;
    if (situation.environmentalDamage) {
      const env = situation.environmentalDamage;
      const resisted = player.inventory.some(i =>
        (env.type === 'poison'  && i.effect === 'poisonResistance') ||
        (env.type === 'burning' && i.effect === 'fireResistance')
      );
      if (!resisted) {
        envDmg = env.magnitude;
        hp = Math.max(0, hp - envDmg);
        const icon = env.type === 'burning' ? '🔥' : env.type === 'poison' ? '☠️' : '❄️';
        addStoryMessage({ role: 'system', content: `${icon} ${env.type} environment: -${envDmg} HP` });
      }
    }

    const finalHp = hp;
    updatePlayerHP(player.id, finalHp);
    if (event.item) addItem(player.id, event.item);

    // Mana + gold + effects in one update
    const manaCost = usedSkill ? Math.max(5, usedSkill.manaCost - (usedSkill.level - 1) * 5) : 0;
    setGameState(prev => ({ ...prev,
      lastEvent: event,
      room: { ...prev.room, players: prev.room.players.map(p => {
        if (p.id !== player.id) return p;
        return { ...p, activeEffects: survivors, gold: p.gold + (event.goldGained ?? 0), mana: Math.max(0, p.mana - manaCost) };
      })},
    }));
    if (event.goldGained) addStoryMessage({ role: 'system', content: `💰 +${event.goldGained} Gold` });

    // Skill level-up
    if (usedSkill) {
      const newUseCount = usedSkill.useCount + 1;
      const levelsUp    = newUseCount >= 3 && usedSkill.level < 3;
      const newLevel    = levelsUp ? usedSkill.level + 1 : usedSkill.level;
      if (levelsUp) addStoryMessage({ role: 'system', content: `✨ ${usedSkill.name} reached Level ${newLevel}!` });
      setGameState(prev => ({ ...prev, room: { ...prev.room, players: prev.room.players.map(p =>
        p.id === player.id ? { ...p, skills: p.skills.map(s => s.id === usedSkill.id
          ? { ...s, useCount: levelsUp ? 0 : newUseCount, level: newLevel } : s) } : p
      )}}));
    }

    const newTurn = turnCount + 1;
    setTurnCount(newTurn);
    addStoryMessage(recapMessage(player, finalHp, event, effectDmg, envDmg));

    // Snapshot for multiplayer update (avoids stale closures)
    const snap = { player, event, pendingChoice, players: gameState.room.players,
      storyHistory: gameState.storyHistory, currentTurn: gameState.room.currentTurn,
      roomCode: gameState.room.roomCode, difficulty: gameState.room.difficulty,
      isMultiplayer: gameState.room.roomCode !== '' };

    await new Promise(r => setTimeout(r, 1200));

    if (finalHp <= 0)      { router.push(`/result?won=false&turns=${newTurn}`); return; }
    if (event.questComplete){ router.push(`/result?won=true&turns=${newTurn}`);  return; }

    const next = await getDMSituation(snap.difficulty, snap.pendingChoice.type, snap.storyHistory, snap.player.class, makeOnChunk());
    const turnDivider: Message | null = snap.isMultiplayer
      ? { role: 'system', content: `⚔️ ${snap.players[(snap.players.findIndex(p => p.id === snap.currentTurn) + 1) % snap.players.length].name}'s turn` }
      : null;
    if (turnDivider) addStoryMessage(turnDivider);
    addStoryMessage({ role: 'assistant', content: next.description });
    setStreamingText('');
    setSituation(next);
    setPendingChoice(null);
    setPhase(next.event === 'merchant' && next.merchantInventory?.length ? 'merchant' : 'choose');

    if (snap.isMultiplayer) {
      const updatedPlayer: Player = { ...snap.player, hp: finalHp, gold: snap.player.gold + (snap.event.goldGained ?? 0),
        inventory: snap.event.item ? [...snap.player.inventory, snap.event.item] : snap.player.inventory, activeEffects: survivors };
      const nextIdx = (snap.players.findIndex(p => p.id === snap.currentTurn) + 1) % snap.players.length;
      updateRoomState(snap.roomCode, {
        players: snap.players.map(p => p.id === snap.player.id ? updatedPlayer : p),
        storyHistory: [...snap.storyHistory, { role: 'user', content: snap.pendingChoice.text }, { role: 'assistant', content: snap.event.story }, ...(turnDivider ? [turnDivider] : []), { role: 'assistant', content: next.description }],
        currentTurn: snap.players[nextIdx].id,
        lastEvent: snap.event,
        currentSituation: next,
      }).catch(console.error);
    }
  }

  if (!player) return null;

  const displayChoices = isMyTurn ? (situation?.choices ?? []).map(c => toDisplayChoice(c, player)) : [];
  const skillChoices   = isMyTurn ? player.skills.map(s => ({
    text: s.name, type: s.type,
    requiredRoll: Math.max(1, s.baseRequired - (s.level - 1) * 2),
    manaCost:     Math.max(5, s.manaCost   - (s.level - 1) * 5),
    isClassSkill: true,
  })) : [];

  return (
    <SafeAreaView style={styles.screen}>
      <GameHeader turnCount={turnCount} onLeave={handleLeave} />
      <PlayerStatusBar player={player} difficulty={gameState.room.difficulty} rollBonus={rollBonus} onToggleInventory={() => setShowInventory(s => !s)} />
      {showInventory && <InventoryPanel items={player.inventory} onUse={handleUseItem} />}
      {isMultiplayer && (
        <View style={styles.turnBar}>
          <Text style={isMyTurn ? styles.turnYou : styles.turnOther}>
            {isMyTurn ? 'Dein Zug' : `${currentTurnPlayer?.name ?? '?'} ist am Zug...`}
          </Text>
          {gameState.room.players.length > 1 && (
            <View style={styles.pips}>
              {gameState.room.players.map(p => (
                <View key={p.id} style={[styles.pip, p.id === gameState.room.currentTurn && styles.pipActive]} />
              ))}
            </View>
          )}
        </View>
      )}
      <EffectsBar activeEffects={player.activeEffects} environmentalDamage={situation?.environmentalDamage} />
      <View style={styles.story}>
        <StoryBox messages={gameState.storyHistory} isLoading={phase === 'processing'} streamingMessage={streamingText} />
      </View>
      <PhaseControls
        phase={phase}
        isMyTurn={isMyTurn}
        displayChoices={displayChoices}
        skillChoices={skillChoices}
        playerMana={player.mana}
        pendingChoice={pendingChoice}
        rollBonus={rollBonus}
        diceKey={diceKey}
        currentTurnPlayer={currentTurnPlayer}
        merchantInventory={situation?.merchantInventory}
        playerGold={player.gold}
        playerInventory={player.inventory}
        onChoice={handleChoice}
        onRoll={handleRoll}
        onBuyItem={handleBuyItem}
        onSellItem={handleSellItem}
        onLeaveMerchant={handleLeaveMerchant}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#0d0a1a', padding: 12, gap: 8 },
  story:    { flex: 1 },
  turnBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a0f2e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  turnYou:  { color: '#c9a227', fontSize: 12, fontWeight: '700' },
  turnOther:{ color: '#6c5a8e', fontSize: 12, fontStyle: 'italic' },
  pips:     { flexDirection: 'row', gap: 6 },
  pip:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3d1f6b' },
  pipActive:{ backgroundColor: '#c9a227' },
});
