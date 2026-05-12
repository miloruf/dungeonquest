import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ChoiceDisplay } from './ChoiceButtons';
import ChoiceButtons from './ChoiceButtons';
import DiceRoller from './DiceRoller';
import MerchantPanel from './MerchantPanel';
import { Item, MerchantItem, Player } from '../types';

type Phase = 'choose' | 'roll' | 'processing' | 'merchant';

interface Props {
  phase:            Phase;
  isMyTurn:         boolean;
  displayChoices:   ChoiceDisplay[];
  skillChoices:     ChoiceDisplay[];
  playerMana:       number;
  pendingChoice:    ChoiceDisplay | null;
  rollBonus:        number;
  diceKey:          number;
  currentTurnPlayer?: Player;
  merchantInventory:  MerchantItem[] | null | undefined;
  playerGold:       number;
  playerInventory:  Item[];
  onChoice:         (c: ChoiceDisplay) => void;
  onRoll:           (raw: number) => void;
  onBuyItem:        (mi: MerchantItem) => void;
  onSellItem:       (item: Item) => void;
  onLeaveMerchant:  () => void;
}

export default function PhaseControls({
  phase, isMyTurn, displayChoices, skillChoices, playerMana,
  pendingChoice, rollBonus, diceKey, currentTurnPlayer,
  merchantInventory, playerGold, playerInventory,
  onChoice, onRoll, onBuyItem, onSellItem, onLeaveMerchant,
}: Props) {
  if (phase === 'merchant' && isMyTurn && merchantInventory?.length) {
    return (
      <MerchantPanel
        inventory={merchantInventory}
        playerGold={playerGold}
        playerInventory={playerInventory}
        onBuy={onBuyItem}
        onSell={onSellItem}
        onLeave={onLeaveMerchant}
      />
    );
  }

  if (phase === 'choose' && isMyTurn) {
    return (
      <View style={styles.col}>
        <ChoiceButtons choices={displayChoices} onChoice={onChoice} />
        {skillChoices.length > 0 && (
          <ChoiceButtons choices={skillChoices} onChoice={onChoice} label="Class Skills:" playerMana={playerMana} />
        )}
      </View>
    );
  }

  if (phase === 'choose' && !isMyTurn) {
    return (
      <View style={styles.waiting}>
        <ActivityIndicator color="#6c3483" size="small" />
        <Text style={styles.waitingText}>Warte auf {currentTurnPlayer?.name ?? 'anderen Spieler'}...</Text>
      </View>
    );
  }

  if (phase === 'roll' || phase === 'processing') {
    return (
      <View style={styles.col}>
        {pendingChoice && (
          <View style={styles.pending}>
            <Text style={styles.pendingLabel}>Action: </Text>
            <Text style={styles.pendingText}>{pendingChoice.text}</Text>
          </View>
        )}
        <DiceRoller
          key={diceKey}
          onRoll={onRoll}
          disabled={phase !== 'roll'}
          requiredRoll={pendingChoice?.requiredRoll}
          bonus={rollBonus}
        />
        {phase === 'processing' && (
          <View style={styles.processing}>
            <ActivityIndicator color="#c9a227" size="small" />
            <Text style={styles.processingText}>The dungeon shifts...</Text>
          </View>
        )}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  col:            { gap: 10 },
  waiting:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  waitingText:    { color: '#4a3a6a', fontSize: 14, fontStyle: 'italic' },
  pending:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e0f3a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#3d1f6b' },
  pendingLabel:   { color: '#6c5a8e', fontSize: 12 },
  pendingText:    { color: '#e8e0f0', fontSize: 12, fontWeight: '700', flex: 1 },
  processing:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  processingText: { color: '#4a3a6a', fontSize: 14, fontStyle: 'italic' },
});
