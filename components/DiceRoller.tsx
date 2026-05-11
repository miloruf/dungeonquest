import { useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  onRoll: (result: number) => void;
  disabled?: boolean;
  requiredRoll?: number;
  bonus?: number;
}

export default function DiceRoller({ onRoll, disabled = false, requiredRoll, bonus = 0 }: Props) {
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  const roll = () => {
    if (disabled || rolling) return;
    setRolling(true);
    spin.setValue(0);

    Animated.timing(spin, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start(() => {
      const value = Math.floor(Math.random() * 20) + 1;
      setResult(value);
      setRolling(false);
      onRoll(value);
    });
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  const isCrit          = result === 20;
  const isFumble        = result === 1;
  const effectiveResult = result !== null ? Math.min(20, result + bonus) : null;
  const margin          = effectiveResult !== null && requiredRoll !== undefined ? effectiveResult - requiredRoll : null;
  const isGreat         = margin !== null && margin >= 6;
  const isSuccess       = margin !== null && margin >= 0;

  const numberColor =
    isCrit || isGreat ? '#f4d03f' :
    isFumble || (margin !== null && margin < 0) ? '#e74c3c' :
    isSuccess ? '#2ecc71' :
    '#f4d03f';

  let resultLabel = '';
  if (result !== null && !rolling) {
    if      (isCrit)            resultLabel = 'Critical Hit!';
    else if (isFumble)          resultLabel = 'Fumble!';
    else if (isGreat)           resultLabel = `Great Success! (+${margin})`;
    else if (isSuccess)         resultLabel = `Success (+${margin})`;
    else if (margin !== null)   resultLabel = `Failed (${Math.abs(margin!)} short)`;
    else                        resultLabel = `Rolled ${result}`;
  }

  const labelColor =
    isCrit || isGreat ? '#f4d03f' :
    isFumble || (margin !== null && !isSuccess) ? '#e74c3c' :
    '#2ecc71';

  return (
    <View style={styles.container}>
      {requiredRoll !== undefined && result === null && !rolling && (
        <Text style={styles.requirement}>Need {requiredRoll}+ to succeed</Text>
      )}

      <TouchableOpacity onPress={roll} disabled={disabled || rolling} activeOpacity={0.8}>
        {/* Wrapper keeps text centered and non-rotating above the animated border */}
        <View style={styles.diceWrapper}>
          <Animated.View style={[styles.diceBorder, disabled && styles.disabled, { transform: [{ rotate }] }]} />
          <Text style={[styles.diceText, { color: numberColor }]}>
            {rolling ? '?' : result ?? 'd20'}
          </Text>
        </View>
      </TouchableOpacity>

      {result !== null && !rolling && bonus > 0 && (
        <Text style={styles.bonusLine}>
          +{bonus} from items → <Text style={styles.bonusEffective}>{effectiveResult}</Text>
        </Text>
      )}
      {resultLabel !== '' && (
        <Text style={[styles.resultLabel, { color: labelColor }]}>{resultLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { alignItems: 'center', gap: 6 },
  requirement:  { color: '#a29bfe', fontSize: 12, fontStyle: 'italic' },
  diceWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceBorder: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: '#2d1b4e',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#c9a227',
    shadowColor: '#c9a227',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  disabled:   { borderColor: '#4a2d7a', opacity: 0.5 },
  diceText:   { fontSize: 24, fontWeight: '800', zIndex: 1 },
  bonusLine:      { color: '#a29bfe', fontSize: 12 },
  bonusEffective: { color: '#f4d03f', fontWeight: '800' },
  resultLabel:    { fontSize: 14, fontWeight: '700' },
});
